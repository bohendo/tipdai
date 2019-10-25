import { Injectable } from '@nestjs/common';
import { bigNumberify, formatEther, parseEther } from 'ethers/utils';
import { Zero } from 'ethers/constants';

import { ConfigService } from '../config/config.service';
import { paymentIdRegex, secretRegex, tipRegex } from '../constants';
import { DepositService } from '../deposit/deposit.service';
import { PaymentService } from '../payment/payment.service';
import { QueueService } from '../queue/queue.service';
import { TipService } from '../tip/tip.service';
import { User } from '../user/user.entity';
import { Logger } from '../utils';

@Injectable()
export class MessageService {
  private log: Logger;

  constructor(
    private readonly config: ConfigService,
    private readonly deposit: DepositService,
    private readonly payment: PaymentService,
    private readonly queue: QueueService,
    private readonly tip: TipService,
  ) {
    this.log = new Logger('MessageService', this.config.logLevel);
  }

  public handlePublicMessage = async (
    sender: User,
    recipient: User,
    message: string,
  ): Promise<string | undefined> => {
    if (sender.twitterId === this.config.twitterBotUserId) { return; }
    const tipInfo = message.match(tipRegex());
    if (!tipInfo || !tipInfo[2]) {
      this.log.info(`Improperly formatted tip, ignoring`);
      return;
    }
    let result = await this.tip.handleTip(sender, recipient, tipInfo[2], message);
    this.log.debug(`Got tip result: ${JSON.stringify(result)}`);
    if (result.indexOf('XXX') !== -1) {
      result = result.replace('XXX', tipInfo[1]);
    }
    return result;
  }

  public handlePrivateMessage = async (
    sender: User,
    message: string,
    messageUrls?: string[],
  ): Promise<string[] | undefined> => {
    if (sender.twitterId === this.config.twitterBotUserId) { return; }
    const messageUrl = messageUrls && messageUrls.length ? messageUrls[0] : undefined;

    if (messageUrl && messageUrl.match(paymentIdRegex) && messageUrl.match(secretRegex)) {
      return [await this.payment.depositPayment(messageUrl, sender)];
    }

    if (false && message.match(/^deposit/i)) {
      const depositAddress = await this.deposit.newDeposit(sender);
      return [
        `Send up to 30 DAI worth of rinkeby ETH to the following address to deposit. ` +
        `This address will be available for deposits for 10 minutes. ` +
        `If you send a transaction with low gas, reply "wait" and the timeout will be extended.`,
        depositAddress,
      ];
    }

    if (false && message.match(/^wait/i)) {
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

    if (message.match(/^balance/i) || message.match(/^refresh/i)) {
      if (sender.cashout) {
        sender.cashout = await this.payment.updatePayment(sender.cashout);
        if (sender.cashout.status === 'PENDING') {
          return [
            `Balance: $${sender.cashout.amount}. Cashout anytime by clicking the following link:\n\n` +
            `${this.config.paymentUrl}?paymentId=${sender.cashout.paymentId}&secret=${sender.cashout.secret}`,
          ];
        }
      }
      return [
        `Your balance is $0.00. Send a link payment to get started.`,
      ];
    }
  }

}
