import { ConditionalTransferTypes } from "@connext/types";
import { toBN } from "@connext/utils";
import { Injectable } from "@nestjs/common";
import { constants, utils } from "ethers";

import { ChannelService } from "../channel/channel.service";
import { ConfigService } from "../config/config.service";
import { LoggerService } from "../logger/logger.service";
import { Payment } from "../payment/payment.entity";
import { PaymentRepository } from "../payment/payment.repository";
import { User } from "../user/user.entity";
import { UserRepository } from "../user/user.repository";

const { formatEther, hexlify, parseEther, randomBytes } = utils;
const { AddressZero, Zero } = constants;

const LINK_LIMIT = parseEther("10");
const paymentIdRegex = /paymentId=0x[0-9a-fA-F]{64}/;
const secretRegex = /secret=0x[0-9a-fA-F]{64}/;

@Injectable()
export class PaymentService {
  private botUser: Promise<User>;

  constructor(
    private readonly channelService: ChannelService,
    private readonly config: ConfigService,
    private readonly log: LoggerService,
    private readonly paymentRepo: PaymentRepository,
    private readonly userRepo: UserRepository,
  ) {
    this.botUser = this.userRepo.getTwitterUser(this.config.twitterBotUserId);
    this.log.setContext("PaymentService");
  }

  public createPayment = async (amount: string, recipient: User): Promise<Payment> => {
    if (amount.startsWith("-") || parseEther(amount).lte(Zero)) {
      throw new Error(`Cannot create payment of value <= 0: ${amount}`);
    }
    this.log.info(`Creating $${amount} payment for user ${recipient.id}`);
    const botBalance = await this.channelService.getBalance();
    this.log.info(`Bot balance ${botBalance} needs to be >= ${amount}`);
    if (parseEther(botBalance).lt(parseEther(amount))) {
      throw new Error(`User does not have enough free balance to create a $${amount} link payment`);
    }
    const result = await this.channelService.createPayment(amount);
    const payment = new Payment();
    payment.paymentId = result.paymentId;
    payment.recipient = recipient;
    payment.sender = await this.botUser;
    payment.secret = result.preImage;
    payment.amount = amount;
    payment.status = "PENDING";
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
    this.log.info(`Depositing payment ${paymentId}`);
    let payment = await this.paymentRepo.findByPaymentId(paymentId);
    if (payment) {
      payment = await this.updatePayment(payment);
      if (payment.status !== "PENDING") {
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
    if (payment.status !== "PENDING") {
      return `Link payment not redeemable, status: ${payment.status}. Your balance: $${sender.cashout.amount}`;
    }
    let senderBalance = parseEther(await this.redeemPayment(payment));
    let cashoutAmt = "0.00";
    if (sender.cashout) {
      const cashout = await this.updatePayment(sender.cashout);
      if (cashout.status === "PENDING") {
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
    return `Successfully redeemed $${payment.amount} link payment!\n` +
      `Old balance: $${cashoutAmt}\n` +
      `New balance: $${sender.cashout.amount}\n` +
      `Cashout anytime by clicking the following link:\n\n` +
      `${this.config.paymentUrl}?paymentId=${sender.cashout.paymentId}&` +
      `secret=${sender.cashout.secret}`;
  }

  public redeemPayment = async (payment: Payment): Promise<string> => {
    this.log.info(`Redeeming $${payment.amount} ${payment.status} payment: ${payment.paymentId}`);
    const collateral = await this.channelService.getCollateral();
    this.log.info(`Token balances: Bot ${await this.channelService.getBalance()} | Node ${collateral}`);
    this.log.info(`Node needs token balance of >= ${payment.amount}`);
    if (parseEther(collateral).lt(parseEther(payment.amount))) {
      this.log.info(`Requesting more collateral for ${this.channelService.tokenAddress}`);
      await this.channelService.requestCollateral();
    }
    let redeemedAmount;
    try {
      this.log.info(`Resolving link transfer`);
      const result = await this.channelService.redeemPayment(payment.paymentId, payment.secret);
      this.log.debug(`Redeemed payment with result: ${JSON.stringify(result, null, 2)}`);
      redeemedAmount = payment.amount;
    } catch (e) {
      if (e.message.match(/already been redeemed/i)) {
        this.log.warn(`Failed to redeem link payment, already redeemed.`);
        redeemedAmount = "0.0";
      } else if (e.message.match(/has not been installed/i)) {
        this.log.warn(`Failed to redeem link payment, node has uninstalled this app.`);
        redeemedAmount = "0.0";
      } else {
        throw e;
      }
    }
    payment.status = "REDEEMED";
    await this.paymentRepo.save(payment);
    this.log.info(`New token balance: ${await this.channelService.getBalance()}`);
    return redeemedAmount;
  }

  public updatePayment = async (payment: Payment): Promise<Payment> => {
    const result = await this.channelService.fetchPayment(payment.paymentId);
    const amount = formatEther(toBN(result.amount));
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
      payment.status = "UNKNOWN";
      payment.amount = "0.00";
    }
    return payment;
  }
}
