import { Injectable } from '@nestjs/common';
import { formatEther, parseEther } from 'ethers/utils';

import { ConfigService } from '../config/config.service';
import { PaymentService } from '../payment/payment.service';
import { User } from '../user/user.entity';
import { UserRepository } from '../user/user.repository';
import { Logger } from '../utils';

import { Tip } from './tip.entity';
import { TipRepository } from '../tip/tip.repository';

@Injectable()
export class TipService {
  private log: Logger;

  constructor(
    private readonly config: ConfigService,
    private readonly userRepo: UserRepository,
    private readonly tipRepo: TipRepository,
    private readonly payment: PaymentService,
  ) {
    this.log = new Logger('TipService', this.config.logLevel);
  }

  public handleTip = async (sender: User, recipient: User, amount: string, message: string): Promise<string> => {
    const amountBN = parseEther(amount);
    try {
      this.log.info(`Handling tip from ${sender.twitterId} to ${recipient.twitterId} amount ${amount}`);

      const newTip = new Tip();
      newTip.message = message;
      newTip.sender = sender;
      newTip.recipient = recipient;
      newTip.amount = amount;
      newTip.result = 'PROCESSING';
      await this.tipRepo.save(newTip);

      if (sender.cashout) {
        sender.cashout = await this.payment.updatePayment(sender.cashout);
      }

      if (!sender.cashout) {
        this.log.info(`Sender balance $0.00 (no deposits) is less than tip amount of ${amount}`);
        return `You don't have a high enough balance to send a $${amount} tip, ` +
        `DM me a link payment to increase your balance & then try again.`;
      }

      if (sender.cashout.status !== 'PENDING') {
        this.log.info(`Sender balance $0.00 (prev cashout of $${sender.cashout.amount} ${sender.cashout.status}) is lower than tip amount of ${amount}`);
        return `You don't have a high enough balance to send a $${amount} tip, ` +
        `DM me a link payment to increase your balance & then try again.`;
      }

      if (parseEther(sender.cashout.amount).lt(amountBN)) {
        this.log.info(`Sender balance $${sender.cashout.amount} is lower than tip amount of ${amount}`);
        return `You don't have a high enough balance to send a $${amount} tip, ` +
        `DM me a link payment to increase your balance & then try again.`;
      }

      this.log.info(`Sender old balance: ${sender.cashout.amount}`);
      const senderBalance = parseEther(await this.payment.redeemPayment(sender.cashout));
      this.log.info(`Sender new balance: ${formatEther(senderBalance.sub(amountBN))}`);
      this.log.info(`Redeemed old cashout payment`);
      sender.cashout = await this.payment.createPayment(
        formatEther(senderBalance.sub(amountBN)),
        sender,
      );
      this.log.info(`Gave sender new cashout payment`);
      await this.userRepo.save(sender);
      this.log.info(`Saved new sender data`);

      this.log.info(`Recipient old balance: $${recipient.cashout ? recipient.cashout.amount : '0.00'}`);
      let recipientBalance = amount;
      if (recipient.cashout) {
        this.log.info(`Recipient has cashout payment.. redeeming old one`);
        recipientBalance = formatEther(parseEther(await this.payment.redeemPayment(recipient.cashout)).add(amountBN));
      }
      this.log.info(`Recipient new balance: ${recipientBalance}`);
      recipient.cashout = await this.payment.createPayment(recipientBalance, recipient);
      this.log.info(`Gave recipient new cashout payment`);
      await this.userRepo.save(recipient);
      this.log.info(`Saved new recipient data`);

      return `Success! A tip of $${amount} has been transfered. @XXX, you can tip someone else (use the tweet pattern mentioned in my bio) or DM me "balance" to cashout.`;

    } catch (e) {
      this.log.info(`Failed to handling tip: ${e}`);
      return `Oops something went wrong, it was probably my fault. Hey @bohendo, can you fix me?`;
    }
  }

}
