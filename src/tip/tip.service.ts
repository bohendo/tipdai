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

  public handleTip = async (sender: User, recipient: User, amount: string, message: string) => {
    try {
      console.log(`Handling tip from ${sender.twitterId} to ${recipient.twitterId} amount ${amount}`);

      const newTip = new Tip();
      newTip.message = message;
      newTip.sender = sender;
      newTip.recipient = recipient;
      newTip.amount = amount;
      newTip.result = 'PROCESSING';
      this.tipRepo.save(newTip);

      if (!sender.balance || parseEther(sender.balance).lt(parseEther(amount))) {
        console.log(`sender balance ${sender.balance} is lower than ${amount}`);
        return 'false';
      }

      console.log(`Sender old balance: ${sender.balance}`);
      sender.balance = formatEther(parseEther(sender.balance).sub(parseEther(amount)));
      console.log(`Sender new balance: ${sender.balance}`);
      await this.payment.redeemPayment(sender.cashout);
      console.log(`Redeemed old cashout payment`);
      sender.cashout = await this.payment.createPayment(sender.balance, sender.twitterId);
      console.log(`Gave sender new cashout payment`);
      this.userRepo.save(sender);
      console.log(`Saved new sender data`);

      console.log(`Recipient old balance: ${recipient.balance}`);
      recipient.balance = formatEther(parseEther(recipient.balance).add(parseEther(amount)));
      console.log(`Recipient new balance: ${recipient.balance}`);
      if (recipient.cashout) {
        console.log(`Recipient had cashout payment.. redeeming old one`);
        await this.payment.redeemPayment(recipient.cashout);
      }
      sender.cashout = await this.payment.createPayment(recipient.balance, recipient.twitterId);
      console.log(`Gave recipient new cashout payment`);
      this.userRepo.save(recipient);
      console.log(`Saved new recipient data`);

      return 'true';
    } catch (e) {
      console.log(`Failed to handling tip: ${e}`);
      return 'false';
    }
  }

}
