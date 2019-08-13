import { ethers as eth } from 'ethers';
import { getChannel } from './channel';
import { config } from './config';
import { db } from './db';

const timeout = 1000 * 60 * 25;
const provider = config.provider;
const { formatEther, parseEther } = eth.utils;
const { AddressZero } = eth.constants;

/*
pendingDeposits = [{
  "address": "0x2960dB45c8a02F9b373DEFAFc6Ac42B1aE3847Fa",
  "amount": "0.00168"
  "startTime": 1564865493796,
  "user": "259539164"
  "oldBalance": "0.4567"
}]
*/

const watchPendingDeposits = () => {
  setInterval(async () => {
    const channel = await getChannel();
    var pendingDeposits = (await db.get('pendingDeposits')) as any;
    if (!pendingDeposits || pendingDeposits === '[]') {
      return; // No pending deposits
    }
    console.log(`Found pending deposits: ${pendingDeposits}`);
    pendingDeposits = JSON.parse(pendingDeposits);

    // Check the balance of each pending deposit address
    pendingDeposits = await Promise.all(
      pendingDeposits.map(async dep => {
        const balance = await provider.getBalance(dep.address);
        if (!dep.oldBalance) {
          dep.oldBalance = formatEther(balance);
        } else if (parseEther(dep.oldBalance).lt(balance)) {
          dep.amount = formatEther(balance.sub(parseEther(dep.oldBalance)));
        }
        return dep;
      }),
    );

    // Deal w completed deposits
    const completeDeposits = pendingDeposits.filter(dep => dep.amount);
    if (completeDeposits.length > 0) {
      console.log(`Completed deposits: ${JSON.stringify(completeDeposits)}`);
      await Promise.all(
        completeDeposits.map(async dep => {
          pendingDeposits = pendingDeposits.filter(dep => !dep.amount);
          let user = (await db.get(`user-${dep.user}`)) as any;
          if (!user) {
            user = { hasBeenWelcomed: true };
            await db.set(`user-${dep.user}`, JSON.stringify(user));
          } else {
            user = JSON.parse(user);
          }
          console.log(`Depositing this deposit into our channel`);
          const tokenAddress = (await db.get('tokenAddress')) as any;
          const swapRate = (await db.get('swapRate')) as any;
          let expectedDeposit = formatEther(
            parseEther(dep.amount).mul(parseEther(swapRate)),
          );
          expectedDeposit = formatEther(
            expectedDeposit.substring(0, expectedDeposit.indexOf('.')),
          );
          console.log(`expectedDeposit: ${expectedDeposit}`);
          let tokenBalances = await channel.getFreeBalance(tokenAddress);
          let oldChannelTokens = tokenBalances[channel.freeBalanceAddress];
          console.log(`Old channel balance: ${oldChannelTokens}`);
          try {
            await channel.deposit({
              amount: parseEther(dep.amount),
              assetId: AddressZero,
            });
            await channel.swap({
              amount: parseEther(dep.amount),
              fromAssetId: AddressZero,
              swapRate: parseEther(swapRate),
              toAssetId: tokenAddress,
            });
          } catch (e) {
            console.error(`Deposit failed :( ${e.message}`);
          }

          if (false && !user.linkPayment) {
            console.log(`Attempting to create link payment`);
            const link = await channel.conditionalTransfer({
              amount: parseEther(user.balance),
              assetId: tokenAddress,
              conditionType: 'LINKED_TRANSFER',
            });
          }

          tokenBalances = await channel.getFreeBalance(tokenAddress);
          let newChannelTokens = tokenBalances[channel.freeBalanceAddress];
          user.balance = user.balance.add(parseEther(expectedDeposit));
          await db.set(`user-${dep.user}`, JSON.stringify(user));
        }),
      );
    }

    // Remove expired deposits
    const expiredDeposits = pendingDeposits.filter(
      dep => dep.startTime + timeout <= Date.now(),
    );
    if (expiredDeposits.length > 0) {
      console.log(`Found expired deposits: ${JSON.stringify(expiredDeposits)}`);
      expiredDeposits.forEach(dep => {
        pendingDeposits = pendingDeposits.filter(
          dep => dep.startTime + timeout > Date.now(),
        );
      });
    }

    // TODO: Use real SQL tables here to avoid ugly race conditions -.-
    console.log(`Saving pending deposits: ${JSON.stringify(pendingDeposits)}`);
    await db.set('pendingDeposits', JSON.stringify(pendingDeposits));
  }, 5 * 1000);
};

export { watchPendingDeposits };
