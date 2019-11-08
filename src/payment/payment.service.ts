import { Injectable } from '@nestjs/common';
import { bigNumberify, formatEther, hexlify, parseEther, randomBytes } from 'ethers/utils';
import { AddressZero, Zero } from 'ethers/constants';

import { ChannelService } from '../channel/channel.service';
import { ConfigService } from '../config/config.service';
import { Payment } from '../payment/payment.entity';
import { PaymentRepository } from '../payment/payment.repository';
import { User } from '../user/user.entity';
import { UserRepository } from '../user/user.repository';
import { Logger } from '../utils';

const LINK_LIMIT = parseEther('10');
const paymentIdRegex = /paymentId=0x[0-9a-fA-F]{64}/;
const secretRegex = /secret=0x[0-9a-fA-F]{64}/;

@Injectable()
export class PaymentService {
  private botUser: Promise<User>;
  private log: Logger;

  constructor(
    private readonly channelService: ChannelService,
    private readonly config: ConfigService,
    private readonly paymentRepo: PaymentRepository,
    private readonly userRepo: UserRepository,
  ) {
    this.botUser = this.userRepo.getTwitterUser(this.config.twitterBotUserId);
    this.log = new Logger('PaymentService', this.config.logLevel);
  }

  public redeemPayment = async (payment: Payment): Promise<string> => {
    this.log.info(`Redeeming $${payment.amount} ${payment.status} payment: ${payment.paymentId}`);
    const channel = await this.channelService.getChannel();
    const freeTokenBalance = await channel.getFreeBalance(this.channelService.tokenAddress);
    const hubFreeBalanceAddress = Object.keys(freeTokenBalance).find(
      addr => addr.toLowerCase() !== channel.freeBalanceAddress.toLowerCase(),
    );
    const collateral = freeTokenBalance[hubFreeBalanceAddress];
    this.log.info(`We've been collateralized with ${formatEther(collateral)}, need ${payment.amount}`);

    // TODO: compare to default collateralization?
    if (bigNumberify(collateral).lt(parseEther(payment.amount))) {
      await channel.addPaymentProfile({
        amountToCollateralize:
          parseEther(payment.amount).sub(freeTokenBalance[hubFreeBalanceAddress]).toString(),
        minimumMaintainedCollateral: parseEther(payment.amount).toString(),
        assetId: this.channelService.tokenAddress,
      });
      await channel.requestCollateral(this.channelService.tokenAddress);
      this.log.info(`Requested more collateral successfully`);
    }

    let redeemedAmount;
    try {
      const result = await channel.resolveCondition({
        conditionType: 'LINKED_TRANSFER',
        paymentId: payment.paymentId,
        preImage: payment.secret,
      });
      this.log.debug(`Redeemed payment with result: ${JSON.stringify(result, null, 2)}`);
      redeemedAmount = payment.amount;
    } catch (e) {
      if (e.message.match(/already been redeemed/i)) {
        this.log.warn(`Failed to redeem link payment, already redeemed.`);
        redeemedAmount = '0.0';
      } else if (e.message.match(/has not been installed/i)) {
        this.log.warn(`Failed to redeem link payment, node has uninstalled this app.`);
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
    const amount = formatEther(bigNumberify(result.amount));
    this.log.info(`Got info for ${payment.paymentId}: status ${result.status}, amount ${amount}`);
    if (result) {
      let saveFlag = false;
      if (payment.status !== result.status) {
        this.log.info(`Updating status of ${payment.paymentId} from ${payment.status} to ${result.status}`);
        payment.status = result.status;
        saveFlag = true;
      }
      if (payment.amount !== amount) {
        this.log.info(`Updating amount of ${payment.paymentId} from ${payment.amount} to ${amount}`);
        payment.amount = amount;
        saveFlag = true;
      }
      if (saveFlag) {
        this.log.debug(`Saving link payment updates`);
        await this.paymentRepo.save(payment);
      }
    } else {
      payment.status = 'UNKNOWN';
      payment.amount = '0.00';
    }
    return payment;
  }

  public createPayment = async (amount: string, recipient: User): Promise<Payment> => {
    const amountBN = parseEther(amount);
    if (amount.startsWith('-') || amountBN.lte(Zero)) {
      throw new Error(`Cannot create payment of value <= 0: ${amount}`);
    }
    this.log.info(`Creating $${amount} payment for user ${recipient.id}`);
    const channel = await this.channelService.getChannel();
    const linkResult = await channel.conditionalTransfer({
      assetId: this.channelService.tokenAddress,
      amount: amountBN.toString(),
      conditionType: 'LINKED_TRANSFER',
      paymentId: hexlify(randomBytes(32)),
      preImage: hexlify(randomBytes(32)),
    });
    const payment = new Payment();
    payment.paymentId = linkResult.paymentId;
    payment.recipient = recipient;
    payment.sender = await this.botUser;
    payment.secret = linkResult.preImage;
    payment.amount = amount;
    payment.status = 'PENDING';
    recipient.cashout = payment;
    await this.paymentRepo.save(payment);
    this.log.info(`Saved new payment for user ${recipient.id}: ${payment.paymentId}`);
    return payment;
  }

  public depositPayment = async (
    sender: User,
    paymentId: string,
    secret: string,
  ): Promise<string> => {
    const channel = await this.channelService.getChannel();
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
    let cashoutAmt = '0.00';
    if (sender.cashout) {
      const cashout = await this.updatePayment(sender.cashout);
      if (cashout.status === 'PENDING') {
        cashoutAmt = await this.redeemPayment(cashout);
        senderBalance = senderBalance.add(parseEther(cashoutAmt));
      }
    }
    sender.cashout = senderBalance.gt(Zero)
      ? await this.createPayment(formatEther(senderBalance), sender)
      : null;
    await this.userRepo.save(sender);
    this.log.info(`Done processing deposit for user ${sender.id}, balance updated from $${cashoutAmt} to $${sender.cashout.amount}`);
    this.log.info(`New cashout for user ${sender.id}: ${sender.cashout.paymentId}`);
    return `Link payment has been redeemed!\nOld balance: $${cashoutAmt}\nNew balance: $${sender.cashout.amount}.\n` +
      `Cashout anytime by clicking the following link:` +
      `\n\n${this.config.paymentUrl}?paymentId=${sender.cashout.paymentId}&` +
      `secret=${sender.cashout.secret}`;
  }
}
