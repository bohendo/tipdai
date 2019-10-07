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
  constructor(
    private readonly channelService: ChannelService,
    private readonly config: ConfigService,
    private readonly paymentRepo: PaymentRepository,
    private readonly userRepo: UserRepository,
  ) {}

  public redeemPayment = async (payment: Payment): Promise<void> => {
    console.log(`Redeeming payment: ${JSON.stringify(payment)}`);
    const channel = await this.channelService.getChannel();
    const freeTokenBalance = await channel.getFreeBalance(this.channelService.tokenAddress);
    const hubFreeBalanceAddress = Object.keys(freeTokenBalance).find(
      addr => addr.toLowerCase() !== channel.freeBalanceAddress.toLowerCase(),
    );
    const collateral = freeTokenBalance[hubFreeBalanceAddress];

    // TODO: compare to default collateralization?
    if (bigNumberify(collateral).lt(parseEther(payment.amount))) {
      await channel.addPaymentProfile({
        amountToCollateralize:
          parseEther(payment.amount).sub(freeTokenBalance[hubFreeBalanceAddress]).toString(),
        minimumMaintainedCollateral: parseEther(payment.amount).toString(),
        assetId: this.channelService.tokenAddress,
      });
      await channel.requestCollateral(this.channelService.tokenAddress);
    }

    const result = await channel.resolveCondition({
      conditionType: 'LINKED_TRANSFER',
      paymentId: payment.paymentId,
      preImage: payment.secret,
    });
    console.log(`Redeemed payment with result: ${JSON.stringify(result, null, 2)}`);
  }

  public createPayment = async (amount: string): Promise<Payment> => {
    const channel = await this.channelService.getChannel();
    const amountBN = parseEther(amount);
    console.log(`Creating a $${amount} link payment`);
    const payment = await channel.conditionalTransfer({
      assetId: this.channelService.tokenAddress,
      amount: amountBN.toString(),
      conditionType: 'LINKED_TRANSFER',
      paymentId: hexlify(randomBytes(32)),
      preImage: hexlify(randomBytes(32)),
    });
    console.log(`Created link payment: ${JSON.stringify(payment, null, 2)}`);
    payment.status = 'PENDING';
    this.paymentRepo.save(payment);
    return payment;
  }

  // Deposit Payment
  // TODO: don't accept any baseUrl, a whitelist should be hardcoded
  public newPayment = async (linkPayment: string, sender: string, recipient: string = AddressZero): Promise<string> => {
    const channel = await this.channelService.getChannel();
    const paymentId = linkPayment.match(paymentIdRegex)[0].replace('paymentId=', '');
    const secret = linkPayment.match(secretRegex)[0].replace('secret=', '');
    const user = await this.userRepo.getByTwitterId(sender);
    let payment = await this.paymentRepo.findByPaymentId(paymentId);
    if (payment && payment.status !== 'PENDING') {
      if (user.payment) {
        return `Link payment already applied. Balance: $${user.balance}. Cashout anytime by clicking the following link:\n\n${user.payment.baseUrl}?paymentId=${user.payment.paymentId}&secret=${user.payment.secret}`;
      } else {
        return `Link payment already applied. Balance: $${user.balance}`;
      }
    }
    payment = new Payment();
    payment.twitterId = sender;
    payment.paymentId = paymentId;
    payment.baseUrl = linkPayment.substring(0, linkPayment.indexOf('?'));
    payment.secret = secret;
    const link = await channel.getLinkedTransfer(paymentId);
    console.log(`Found link: ${JSON.stringify(link)}`);
    payment.amount = link && link.amount ? formatEther(bigNumberify(link.amount)) : '0.00';
    payment.status = link && link.status ? link.status : 'UNKNOWN';
    if (payment.status !== 'PENDING') {
      return `Link payment not redeemable. Your balance: $${user.balance}`;
    }
    console.log(`Saving new link payment ${JSON.stringify(payment)}`);
    await this.paymentRepo.save(payment);
    await this.redeemPayment(payment);
    user.balance = formatEther(parseEther(user.balance).add(parseEther(payment.amount)));
    await this.userRepo.save(user);
    payment.status = 'REDEEMED';
    await this.paymentRepo.save(payment);
    if (user.payment) {
      await this.redeemPayment(user.payment);
    }
    user.payment = await this.createPayment(user.balance);
    await this.userRepo.save(user);
    return `Link payment has been redeemed. New balance: $${user.balance}.\nCashout anytime by clicking the following link:\n\n${user.payment.baseUrl}?paymentId=${user.payment.paymentId}&secret=${user.payment.secret}`;
  }
}
