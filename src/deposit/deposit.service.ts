import { ConditionalTransferTypes } from "@connext/types";
import { Injectable } from "@nestjs/common";
import { AddressZero } from "ethers/constants";
import { formatEther, parseEther } from "ethers/utils";

import { ChannelService } from "../channel/channel.service";
import { ConfigService } from "../config/config.service";
import { LoggerService } from "../logger/logger.service";
import { PaymentService } from "../payment/payment.service";

import { Deposit } from "./deposit.entity";
import { DepositRepository } from "./deposit.repository";
import { User } from "../user/user.entity";
import { UserRepository } from "../user/user.repository";

const timeout = 1000 * 60 * 25;

@Injectable()
export class DepositService {
  constructor(
    private readonly config: ConfigService,
    private readonly channel: ChannelService,
    private readonly depositRepo: DepositRepository,
    private readonly log: LoggerService,
    private readonly payment: PaymentService,
    private readonly userRepo: UserRepository,
  ) {
    this.log.setContext("DepositService");
    this.startDepositPoller();
  }

  public newDeposit = async (sender: User): Promise<string> => {
    let deposit;
    deposit = await this.depositRepo.findOne({ user: sender });
    if (deposit && deposit.address) {
      return deposit.address;
    }
    if (!deposit) {
      deposit = new Deposit();
      deposit.startTime = new Date();
      deposit.user = sender;
    }
    const pendingDeposits = await this.depositRepo.getAllPending();
    if (!pendingDeposits) {
      deposit.address = this.config.getWallet(1).address;
    } else {
      deposit.address = this.config.getWallet(pendingDeposits.length + 1).address;
    }
    deposit.oldBalance = formatEther(await this.config.ethProvider.getBalance(deposit.address));
    await this.depositRepo.save(deposit);
    return deposit.address;
  }

  public delayDeposit = async (sender: User): Promise<string> => {
    let deposit;
    deposit = await this.depositRepo.findOne({ user: sender });
    if (deposit && deposit.address) {
      return deposit.address;
    }
    if (!deposit) {
      deposit = new Deposit();
      deposit.startTime = new Date();
      deposit.user = sender;
    }
    const pendingDeposits = await this.depositRepo.getAllPending();
    if (!pendingDeposits) {
      deposit.address = this.config.getWallet(1).address;
    } else {
      deposit.address = this.config.getWallet(pendingDeposits.length + 1).address;
    }
    deposit.oldBalance = formatEther(await this.config.ethProvider.getBalance(deposit.address));
    await this.depositRepo.save(deposit);
    return deposit.address;
  }

  public startDepositPoller = () => {
    setInterval(async () => {
      await this.checkForDeposits();
    }, 5 * 1000);
  }

  public checkForDeposits = async () => {
    let pendingDeposits = await this.depositRepo.getAllPending();
    if (!pendingDeposits || pendingDeposits === []) {
      this.log.info(`No pending deposits`);
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
      this.log.info(`Completed deposits: ${JSON.stringify(completeDeposits)}`);
      await Promise.all(
        completeDeposits.map(async dep => {
          pendingDeposits = pendingDeposits.filter(depp => !depp.amount);
          const user = await this.userRepo.findOne(dep.user);
          if (!user) {
            this.log.warn(`Got a deposit from a user we've never seen before?!`);
            return;
          }
          this.log.info(`Depositing this deposit into our channel`);
          const tokenAddress = this.channel.tokenAddress;
          const swapRate = this.channel.swapRate;
          let expectedDeposit = formatEther(
            parseEther(dep.amount).mul(parseEther(swapRate)),
          );
          expectedDeposit = formatEther(
            expectedDeposit.substring(0, expectedDeposit.indexOf(".")),
          );
          this.log.info(`expectedDeposit: ${expectedDeposit}`);
          let balanceBefore = await this.channel.getBalance();
          this.log.info(`Channel balance before deposit: ${balanceBefore}`);

          // TODO: Port over daicard's deposit & swap all functions

          const balanceAfter = await this.channel.getBalance();

          this.log.info(`Depositor old balance: ${user.cashout.amount}`);

          const userBalance = formatEther(parseEther(user.cashout.amount)
            .add(parseEther(expectedDeposit)));
          this.log.info(`Sender new balance: ${userBalance}`);
          await this.payment.redeemPayment(user.cashout);
          this.log.info(`Redeemed old cashout payment`);
          user.cashout = await this.payment.createPayment(userBalance, user);
          this.log.info(`Gave user new cashout payment`);
          await this.userRepo.save(user);
          this.log.info(`Saved new user data`);

          await this.userRepo.save(user);
          await this.depositRepo.remove(dep);
        }),
      );
    }

    // Remove expired deposits
    const expiredDeposits = pendingDeposits.filter(
      dep => dep.startTime.valueOf() + timeout <= Date.now(),
    );
    if (expiredDeposits.length > 0) {
      this.log.info(`Found expired deposits: ${JSON.stringify(expiredDeposits)}`);
      expiredDeposits.forEach(dep => {
        pendingDeposits = pendingDeposits.filter(
          depp => depp.startTime.valueOf() + timeout > Date.now(),
        );
      });
    }
  }

}
