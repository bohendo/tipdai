import { Injectable } from '@nestjs/common';
import { formatEther, parseEther } from 'ethers/utils';

import { User } from '../user/user.entity';
import { UserRepository } from '../user/user.repository';
import { PaymentService } from '../payment/payment.service';

import { Tip } from './tip.entity';
import { TipRepository } from '../tip/tip.repository';

@Injectable()
export class TipService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly tipRepo: TipRepository,
    private readonly payment: PaymentService,
  ) {}

  public handleTip = async (sender: User, recipient: User, amount: string, message: string): Promise<string> => {
    const amountBN = parseEther(amount);
    try {
      console.log(`Handling tip from ${sender.twitterId} to ${recipient.twitterId} amount ${amount}`);

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

      if (!sender.cashout || sender.cashout.status !== 'PENDING' || parseEther(sender.cashout.amount).lt(amountBN)) {
        console.log(`Sender balance $${sender.cashout ? sender.cashout.amount : '0.00'} (${sender.cashout.status}) is lower than tip amount of ${amount}`);
        return `You don't have a high enough balance to send a $${amount} tip, ` +
        `DM me a link payment to increase your balance & then try again.`;
      }

      console.log(`Sender old balance: ${sender.cashout.amount}`);
      const senderBalance = parseEther(await this.payment.redeemPayment(sender.cashout));
      console.log(`Sender new balance: ${formatEther(senderBalance.sub(amountBN))}`);
      console.log(`Redeemed old cashout payment`);
      sender.cashout = await this.payment.createPayment(
        formatEther(senderBalance.sub(amountBN)),
        sender,
      );
      console.log(`Gave sender new cashout payment`);
      await this.userRepo.save(sender);
      console.log(`Saved new sender data`);

      console.log(`Recipient old balance: $${recipient.cashout ? recipient.cashout.amount : '0.00'}`);
      let recipientBalance = amount;
      if (recipient.cashout) {
        console.log(`Recipient has cashout payment.. redeeming old one`);
        recipientBalance = formatEther(parseEther(await this.payment.redeemPayment(recipient.cashout)).add(amountBN));
      }
      console.log(`Recipient new balance: ${recipientBalance}`);
      recipient.cashout = await this.payment.createPayment(recipientBalance, recipient);
      console.log(`Gave recipient new cashout payment`);
      await this.userRepo.save(recipient);
      console.log(`Saved new recipient data`);

      return `Success! A tip of $${amount} has been transfered. XXX, you can tip someone else (use the tweet pattern mentioned in my bio) or DM me "balance" to cashout.`;

    } catch (e) {
      console.log(`Failed to handling tip: ${e}`);
      return `Oops something went wrong, it was probably my fault. Hey @bohendo, can you fix me?`;
    }
  }

}
