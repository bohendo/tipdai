import { Injectable } from '@nestjs/common';
import { bigNumberify, formatEther, hexlify, parseEther, randomBytes } from 'ethers/utils';
import { AddressZero, Zero } from 'ethers/constants';

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

  public redeemPayment = async (payment: Payment): Promise<string> => {
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

    let redeemedAmount;
    try {
      const result = await channel.resolveCondition({
        conditionType: 'LINKED_TRANSFER',
        paymentId: payment.paymentId,
        preImage: payment.secret,
      });
      console.debug(`Redeemed payment with result: ${JSON.stringify(result, null, 2)}`);
      redeemedAmount = payment.amount;
    } catch (e) {
      if (e.message.match(/already been redeemed/i)) {
        console.warn(`Failed to redeem link payment, already redeemed.`);
        redeemedAmount = '0.0';
      } else if (e.message.match(/has not been installed/i)) {
        console.warn(`Failed to redeem link payment, node has uninstalled this app.`);
        redeemedAmount = '0.0';
      } else {
        throw e;
      }
    }
    payment.status = 'REDEEMED';
    await this.paymentRepo.save(payment);
    return redeemedAmount;
  }

  public updatePayment = async (payment: Payment): Promise<Payment> => {
    const channel = await this.channelService.getChannel();
    const result = await channel.getLinkedTransfer(payment.paymentId);
    console.log(`Got info for payment ${payment.paymentId} from hub: ${JSON.stringify(result)}`);
    if (result) {
      let saveFlag = false;
      if (payment.status !== result.status) {
        console.log(`Updating status of payment ${payment.paymentId} from ${payment.status} to ${result.status}`);
        payment.status = result.status;
        saveFlag = true;
      }
      const amount = formatEther(bigNumberify(result.amount));
      if (payment.amount !== amount) {
        console.log(`Updating amount of payment ${payment.paymentId} from ${payment.amount} to ${amount}`);
        payment.amount = amount;
        saveFlag = true;
      }
      if (saveFlag) {
        console.log(`Saving updated link payment: ${JSON.stringify(payment)}`);
        await this.paymentRepo.save(payment);
      }
    } else {
      payment.status = 'UNKNOWN';
      payment.amount = '0.00';
    }
    return payment;
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
    if (payment) {
      payment = await this.updatePayment(payment);
      if (payment.status !== 'PENDING') {
        if (sender.cashout) {
          return `Link payment already applied, status: ${payment.status}. Balance: $${sender.cashout.amount}.\n` +
            `Cashout anytime by clicking the following link:\n\n` +
            `${this.config.paymentUrl}?paymentId=${sender.cashout.paymentId}&` +
            `secret=${sender.cashout.secret}`;
        } else {
          return `Link payment already applied, status: ${payment.status}. Balance: $0.00`;
        }
      }
    }
    payment = new Payment();
    payment.sender = sender;
    payment.paymentId = paymentId;
    payment.secret = secret;
    payment = await this.updatePayment(payment);
    if (payment.status !== 'PENDING') {
      return `Link payment not redeemable, status: ${payment.status}. Your balance: $${sender.cashout.amount}`;
    }

    let senderBalance = parseEther(await this.redeemPayment(payment));
    let cashout = '0.0';
    if (sender.cashout) {
      cashout = parseEther(await this.redeemPayment(await this.updatePayment(sender.cashout)));
      if (cashout.status === 'PENDING') {
        senderBalance = senderBalance.add(cashout);
      }
    }
    sender.cashout = senderBalance.gt(Zero)
      ? await this.createPayment(formatEther(senderBalance), sender)
      : null;
    await this.userRepo.save(sender);
    return `Link payment has been redeemed. Old balance: ${formatEther(cashout)}, New balance: $${sender.cashout.amount}.\n` +
      `Cashout anytime by clicking the following link:` +
      `\n\n${this.config.paymentUrl}?paymentId=${sender.cashout.paymentId}&` +
      `secret=${sender.cashout.secret}`;
  }
}
