import { Injectable } from '@nestjs/common';
import { bigNumberify, formatEther, hexlify, parseEther, randomBytes } from 'ethers/utils';
import { AddressZero} from 'ethers/constants';

import { ChannelService } from '../channel/channel.service';
import { ConfigService } from '../config/config.service';

import { Payment } from '../payment/payment.entity';
import { PaymentRepository } from '../payment/payment.repository';
import { User } from '../user/user.entity';
import { UserRepository } from '../user/user.repository';

const LINK_LIMIT = parseEther('10');
const paymentIdRegex = /paymentId=0x[0-9a-fA-F]{64}/;
const secretRegex = /secret=0x[0-9a-fA-F]{64}/;

@Injectable()
export class PaymentService {
  private botUser: Promise<User>;

  constructor(
    private readonly channelService: ChannelService,
    private readonly config: ConfigService,
    private readonly paymentRepo: PaymentRepository,
    private readonly userRepo: UserRepository,
  ) {
    this.botUser = this.userRepo.getByTwitterId(this.config.twitterBotUserId);
  }

  public redeemPayment = async (payment: Payment): Promise<void> => {
    console.log(`Redeeming payment: ${JSON.stringify(payment)}`);
    const channel = await this.channelService.getChannel();
    const freeTokenBalance = await channel.getFreeBalance(this.channelService.tokenAddress);
    const hubFreeBalanceAddress = Object.keys(freeTokenBalance).find(
      addr => addr.toLowerCase() !== channel.freeBalanceAddress.toLowerCase(),
    );
    const collateral = freeTokenBalance[hubFreeBalanceAddress];
    console.log(`We've been collateralized with ${formatEther(collateral)}, need ${payment.amount}`);

    // TODO: compare to default collateralization?
    if (bigNumberify(collateral).lt(parseEther(payment.amount))) {
      await channel.addPaymentProfile({
        amountToCollateralize:
          parseEther(payment.amount).sub(freeTokenBalance[hubFreeBalanceAddress]).toString(),
        minimumMaintainedCollateral: parseEther(payment.amount).toString(),
        assetId: this.channelService.tokenAddress,
      });
      await channel.requestCollateral(this.channelService.tokenAddress);
      console.log(`Requested more collateral successfully`);
    }

    const result = await channel.resolveCondition({
      conditionType: 'LINKED_TRANSFER',
      paymentId: payment.paymentId,
      preImage: payment.secret,
    });
    console.log(`Redeemed payment with result: ${JSON.stringify(result, null, 2)}`);
  }

  public createPayment = async (amount: string, recipient: User): Promise<Payment> => {
    console.log(`Creating payment for ${amount}`);
    const amountBN = parseEther(amount);
    const channel = await this.channelService.getChannel();
    const linkResult = await channel.conditionalTransfer({
      assetId: this.channelService.tokenAddress,
      amount: amountBN.toString(),
      conditionType: 'LINKED_TRANSFER',
      paymentId: hexlify(randomBytes(32)),
      preImage: hexlify(randomBytes(32)),
    });
    console.log(`Created link transfer, result: ${JSON.stringify(linkResult, null, 2)}`);
    const payment = new Payment();
    payment.paymentId = linkResult.paymentId;
    payment.recipient = recipient;
    payment.sender = await this.botUser;
    payment.secret = linkResult.preImage;
    payment.amount = amount;
    payment.status = 'PENDING';
    recipient.cashout = payment;
    console.log(`Saving new payment`);
    await this.paymentRepo.save(payment);
    console.log(`Saving updated cashout link`);
    await this.userRepo.save(recipient);
    return payment;
  }

  public depositPayment = async (linkPayment: string, sender: User): Promise<string> => {
    const channel = await this.channelService.getChannel();
    const paymentId = linkPayment.match(paymentIdRegex)[0].replace('paymentId=', '');
    const secret = linkPayment.match(secretRegex)[0].replace('secret=', '');
    let payment = await this.paymentRepo.findByPaymentId(paymentId);
    if (payment && payment.status !== 'PENDING') {
      if (sender.cashout) {
        return `Link payment already applied, status: ${payment.status}. Balance: $${sender.balance}.\n` +
          `Cashout anytime by clicking the following link:\n\n` +
          `${this.config.linkBaseUrl}?paymentId=${sender.cashout.paymentId}&` +
          `secret=${sender.cashout.secret}`;
      } else {
        return `Link payment already applied, status: ${payment.status}. Balance: $${sender.balance}`;
      }
    }
    payment = new Payment();
    payment.sender = sender;
    payment.paymentId = paymentId;
    payment.secret = secret;
    const link = await channel.getLinkedTransfer(paymentId);
    console.log(`Found link: ${JSON.stringify(link)}`);
    payment.amount = link && link.amount ? formatEther(bigNumberify(link.amount)) : '0.00';
    payment.status = link && link.status ? link.status : 'UNKNOWN';
    if (payment.status !== 'PENDING') {
      return `Link payment not redeemable, status: ${payment.status}. Your balance: $${sender.balance}`;
    }
    console.log(`Saving new link payment ${JSON.stringify(payment)}`);
    await this.paymentRepo.save(payment);
    await this.redeemPayment(payment);
    sender.balance = formatEther(parseEther(sender.balance).add(parseEther(payment.amount)));
    await this.userRepo.save(sender);
    payment.status = 'REDEEMED';
    await this.paymentRepo.save(payment);
    if (sender.cashout) {
      await this.redeemPayment(sender.cashout);
    }
    sender.cashout = await this.createPayment(sender.balance, sender);
    await this.userRepo.save(sender);
    return `Link payment has been redeemed. New balance: $${sender.balance}.\n` +
      `Cashout anytime by clicking the following link:` +
      `\n\n${this.config.linkBaseUrl}?paymentId=${sender.cashout.paymentId}&` +
      `secret=${sender.cashout.secret}`;
  }
}
