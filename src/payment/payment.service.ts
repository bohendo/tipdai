import { Injectable } from '@nestjs/common';
import { bigNumberify, formatEther, parseEther } from 'ethers/utils';

import { ChannelService } from '../channel/channel.service';
import { ConfigService } from '../config/config.service';

import { Payment } from '../payment/payment.entity';
import { PaymentRepository } from '../payment/payment.repository';
import { User } from '../user/user.entity';
import { UserRepository } from '../user/user.repository';

@Injectable()
export class PaymentService {
  constructor(
    private readonly config: ConfigService,
    private readonly channel: ChannelService,
    private readonly paymentRepo: PaymentRepository,
    private readonly userRepo: UserRepository,
  ) {}

  public newPayment = async (paymentId: string, secret: string, sender: string): Promise<string[]> => {
    const user = await this.userRepo.findByTwitterId(sender);
    let payment = await this.paymentRepo.findByPaymentId(paymentId);
    if (payment) {
      return [`Link payment ${paymentId} already applied. Balance: ${user.balance}`];
    }
    payment = new Payment();
    payment.twitterId = sender;
    payment.paymentId = paymentId;
    payment.secret = secret;
    const channel = await this.channel.getChannel();
    const link = await channel.getLinkedTransfer(paymentId);
    console.log(`Found link: ${JSON.stringify(link)}`);
    payment.amount = link && link.amount ? formatEther(bigNumberify(link.amount)) : '0.00';
    payment.status = link && link.status ? link.status : 'UNKNOWN';
    // if (status === 'REDEEMED') { oh boy }
    // await this.paymentRepo.save(payment);
    console.log(`Detected new link payment ${JSON.stringify(payment)}`);
    if (user.payment) {
      console.log(`NOT IMPLEMENTED YET`);
      // redeem old link payment
      // redeem new link payment
      // create new link payment w combined balance
      user.balance = formatEther(parseEther(user.balance).add(parseEther(payment.amount)));
      return [`Idk how to handle this..`];
    } else {
      user.balance = formatEther(parseEther(user.balance).add(parseEther(payment.amount)));
      user.payment = payment;
      return [
        `Link payment has been applied. New balance: $${user.balance}. Cashout anytime by clicking the following link`,
        `${user.payment}`,
      ];
    }
  }

}
