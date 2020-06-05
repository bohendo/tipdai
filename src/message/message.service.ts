import { DecString } from "@connext/types";
import { Injectable } from "@nestjs/common";
import { bigNumberify, formatEther, parseEther } from "ethers/utils";
import { Zero } from "ethers/constants";

import { ConfigService } from "../config/config.service";
import { LoggerService } from "../logger/logger.service";
import { paymentIdRegex, secretRegex, twitterTipRegex } from "../constants";
import { DepositService } from "../deposit/deposit.service";
import { PaymentService } from "../payment/payment.service";
import { QueueService } from "../queue/queue.service";
import { TipService } from "../tip/tip.service";
import { User } from "../user/user.entity";

@Injectable()
export class MessageService {
  constructor(
    private readonly config: ConfigService,
    private readonly deposit: DepositService,
    private readonly log: LoggerService,
    private readonly payment: PaymentService,
    private readonly queue: QueueService,
    private readonly tip: TipService,
  ) {
    this.log.setContext("MessageService");
  }

  public handlePublicMessage = async (
    sender: User,
    recipient: User,
    amount: DecString,
    message: string,
  ): Promise<string | undefined> => {
    this.log.info(`Sending $${amount} tip from ${sender.twitterName || sender.address} to ${recipient.twitterName || recipient.address}`);
    const result = await this.tip.handleTip(sender, recipient, amount, message);
    this.log.debug(`Got tip result: ${JSON.stringify(result)}`);
    return result;
  }

  public handlePrivateMessage = async (
    sender: User,
    message: string,
  ): Promise<string[] | undefined> => {
    const paymentIdMatch = message.match(paymentIdRegex);
    const secretMatch = message.match(secretRegex);
    if (paymentIdMatch && paymentIdMatch[1] && secretMatch && secretMatch[1]) {
      this.log.info(`Handling link payment`);
      return [await this.payment.depositPayment(sender, paymentIdMatch[1], secretMatch[1])];
    }

    if (false && message.match(/^deposit/i)) {
      this.log.info(`Handling deposit request`);
      const depositAddress = await this.deposit.newDeposit(sender);
      return [
        `Send up to 30 DAI worth of rinkeby ETH to the following address to deposit. ` +
        `This address will be available for deposits for 10 minutes. ` +
        `If you send a transaction with low gas, reply "wait" and the timeout will be extended.`,
        depositAddress,
      ];
    }

    if (false && message.match(/^wait/i)) {
      this.log.info(`Handling deposit delay request`);
      const depositAddress = await this.deposit.delayDeposit(sender);
      if (!depositAddress) {
        return [`No deposit found, reply with "deposit" to start a deposit.`];
      }
      return [
        `Timeout extended, you have 10 more minutes to deposit up to 30 DAI worth of rinkeby ETH to the below address. ` +
        `If you want to extend again, reply "wait" as many times as needed.`,
        depositAddress,
      ];
    }

    this.log.info(`Default: handling balance query`);
    if (sender.cashout) {
      sender.cashout = await this.payment.updatePayment(sender.cashout);
      if (sender.cashout.status === "PENDING") {
        return [
          `Balance: $${sender.cashout.amount}. Cashout anytime by clicking the following link:\n\n` +
          `${this.config.paymentUrl}?paymentId=${sender.cashout.paymentId}&secret=${sender.cashout.secret}`,
        ];
      }
    }
    return [
      `Your balance is $0.00. Send a link payment (generated from rinkeby.daicard.io) to get started.`,
    ];
  }

}
