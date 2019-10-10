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
    try {
      console.log(`Handling tip from ${sender.twitterId} to ${recipient.twitterId} amount ${amount}`);

      const newTip = new Tip();
      newTip.message = message;
      newTip.sender = sender;
      newTip.recipient = recipient;
      newTip.amount = amount;
      newTip.result = 'PROCESSING';
      await this.tipRepo.save(newTip);

      if (!sender.balance || parseEther(sender.balance).lt(parseEther(amount))) {
        console.log(`sender balance ${sender.balance} is lower than ${amount}`);
        return `You don't have a high enough balance to send a $${amount} tip, ` +
        `DM me a link payment to increase your balance & then try again.`;
      }

      console.log(`Sender old balance: ${sender.balance}`);
      sender.balance = formatEther(parseEther(sender.balance).sub(parseEther(amount)));
      console.log(`Sender new balance: ${sender.balance}`);
      await this.payment.redeemPayment(sender.cashout);
      console.log(`Redeemed old cashout payment`);
      sender.cashout = await this.payment.createPayment(sender.balance, sender.twitterId);
      console.log(`Gave sender new cashout payment`);
      await this.userRepo.save(sender);
      console.log(`Saved new sender data`);

      console.log(`Recipient old balance: ${recipient.balance}`);
      recipient.balance = formatEther(parseEther(recipient.balance).add(parseEther(amount)));
      console.log(`Recipient new balance: ${recipient.balance}`);
      if (recipient.cashout) {
        console.log(`Recipient had cashout payment.. redeeming old one`);
        await this.payment.redeemPayment(recipient.cashout);
      }
      recipient.cashout = await this.payment.createPayment(recipient.balance, recipient.twitterId);
      console.log(`Gave recipient new cashout payment`);
      await this.userRepo.save(recipient);
      console.log(`Saved new recipient data`);

      return `@YYY, your tip was successful! A payment of $${amount} has been transfered. XXX, you can tip someone else with the tweet pattern mentioned in my bio or DM me "balance" to cashout.`;

    } catch (e) {
      console.log(`Failed to handling tip: ${e}`);
      return `Oops something went wrong, it was probably my fault. Hey @bohendo, can you fix me?`;
    }
  }

}
