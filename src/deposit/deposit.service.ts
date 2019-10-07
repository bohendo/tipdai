import { Injectable } from '@nestjs/common';
import { AddressZero } from 'ethers/constants';
import { formatEther, parseEther } from 'ethers/utils';

import { ChannelService } from '../channel/channel.service';
import { ConfigService } from '../config/config.service';

import { Deposit } from './deposit.entity';
import { DepositRepository } from './deposit.repository';
import { User } from '../user/user.entity';
import { UserRepository } from '../user/user.repository';

const timeout = 1000 * 60 * 25;

@Injectable()
export class DepositService {
  constructor(
    private readonly config: ConfigService,
    private readonly channel: ChannelService,
    private readonly depositRepo: DepositRepository,
    private readonly userRepo: UserRepository,
  ) {
    this.startDepositPoller();
  }

  public newDeposit = async (sender: string): Promise<string> => {
    const user = await this.userRepo.getByTwitterId(sender);
    let deposit;
    deposit = await this.depositRepo.findOne({ user });
    if (deposit && deposit.address) {
      return deposit.address;
    }
    if (!deposit) {
      deposit = new Deposit();
      deposit.startTime = new Date();
      deposit.user = user;
    }
    const pendingDeposits = await this.depositRepo.getAllPending();
    if (!pendingDeposits) {
      deposit.address = this.config.getWallet(1).address;
    } else {
      deposit.address = this.config.getWallet(pendingDeposits.length + 1).address;
    }
    deposit.oldBalance = formatEther(await this.config.ethProvider.getBalance(deposit.address));
    this.depositRepo.save(deposit);
    return deposit.address;
  }

  public delayDeposit = async (sender: string): Promise<string> => {
    const user = await this.userRepo.getByTwitterId(sender);
    let deposit;
    deposit = await this.depositRepo.findOne({ user });
    if (deposit && deposit.address) {
      return deposit.address;
    }
    if (!deposit) {
      deposit = new Deposit();
      deposit.startTime = new Date();
      deposit.user = user;
    }
    const pendingDeposits = await this.depositRepo.getAllPending();
    if (!pendingDeposits) {
      deposit.address = this.config.getWallet(1).address;
    } else {
      deposit.address = this.config.getWallet(pendingDeposits.length + 1).address;
    }
    deposit.oldBalance = formatEther(await this.config.ethProvider.getBalance(deposit.address));
    this.depositRepo.save(deposit);
    return deposit.address;
  }

  public startDepositPoller = () => {
    setInterval(async () => {
      await this.checkForDeposits();
    }, 5 * 1000);
  }

  public checkForDeposits = async () => {
    const channel = await this.channel.getChannel();
    let pendingDeposits = await this.depositRepo.getAllPending();
    if (!pendingDeposits || pendingDeposits === []) {
      console.log(`No pending deposits`);
      return;
    }
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
          const user = await this.userRepo.findOne(dep.user);
          if (!user) {
            console.warn(`Got a deposit from a user we've never seen before?!`);
            return;
          }
          console.log(`Depositing this deposit into our channel`);
          const tokenAddress = this.channel.tokenAddress;
          const swapRate = this.channel.swapRate;
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

          /*
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
          */

          tokenBalances = await channel.getFreeBalance(tokenAddress);
          const newChannelTokens = tokenBalances[channel.freeBalanceAddress];
          user.balance = formatEther(parseEther(user.balance).add(parseEther(expectedDeposit)));
          this.userRepo.save(user);
          this.depositRepo.remove(dep);
        }),
      );
    }

    // Remove expired deposits
    const expiredDeposits = pendingDeposits.filter(
      dep => dep.startTime.valueOf() + timeout <= Date.now(),
    );
    if (expiredDeposits.length > 0) {
      console.log(`Found expired deposits: ${JSON.stringify(expiredDeposits)}`);
      expiredDeposits.forEach(dep => {
        pendingDeposits = pendingDeposits.filter(
          depp => depp.startTime.valueOf() + timeout > Date.now(),
        );
      });
    }
  }

}
