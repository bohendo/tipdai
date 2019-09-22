import { Injectable } from '@nestjs/common';
import { AddressZero } from 'ethers/constants';
import { formatEther, parseEther } from 'ethers/utils';

import { ChannelService } from '../channel/channel.service';
import { ConfigService } from '../config/config.service';

import { Deposit } from './deposit.entity';
import { DepositRepository } from './deposit.repository';

const timeout = 1000 * 60 * 25;

@Injectable()
export class DepositService {
  constructor(
    private readonly config: ConfigService,
    private readonly channel: ChannelService,
    private readonly depositRepository: DepositRepository,
  ) {}

  public watchForDeposits = () => {
    setInterval(async () => {
      const channel = await this.channel.getChannel();
      let pendingDeposits = '[{"amount":"1"}]' as any; // (await db.get('pendingDeposits')) as any;
      if (!pendingDeposits || pendingDeposits === '[]') {
        return; // No pending deposits
      }
      console.log(`Found pending deposits: ${pendingDeposits}`);
      pendingDeposits = JSON.parse(pendingDeposits);

      // Check the balance of each pending deposit address
      pendingDeposits = await Promise.all(
        pendingDeposits.map(async dep => {
          const balance = await this.config.ethProvider.getBalance(dep.address);
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
            pendingDeposits = pendingDeposits.filter(depp => !depp.amount);
            let user = '{"balance":"1"}' as any; // (await db.get(`user-${dep.user}`)) as any;
            if (!user) {
              user = { hasBeenWelcomed: true };
              // await db.set(`user-${dep.user}`, JSON.stringify(user));
            } else {
              user = JSON.parse(user);
            }
            console.log(`Depositing this deposit into our channel`);
            const tokenAddress = ''; // (await db.get('tokenAddress')) as any;
            const swapRate = '100'; // (await db.get('swapRate')) as any;
            let expectedDeposit = formatEther(
              parseEther(dep.amount).mul(parseEther(swapRate)),
            );
            expectedDeposit = formatEther(
              expectedDeposit.substring(0, expectedDeposit.indexOf('.')),
            );
            console.log(`expectedDeposit: ${expectedDeposit}`);
            let tokenBalances = await channel.getFreeBalance(tokenAddress);
            const oldChannelTokens = tokenBalances[channel.freeBalanceAddress];
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
            const newChannelTokens = tokenBalances[channel.freeBalanceAddress];
            user.balance = user.balance.add(parseEther(expectedDeposit));
            // await db.set(`user-${dep.user}`, JSON.stringify(user));
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
            depp => depp.startTime + timeout > Date.now(),
          );
        });
      }

      console.log(`Saving pending deposits: ${JSON.stringify(pendingDeposits)}`);
    }, 5 * 1000);

  }
}
