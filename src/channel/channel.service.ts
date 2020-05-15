import { connect as connext } from "@connext/client";
import { getPostgresStore } from "@connext/store";
import {
  Address,
  ConditionalTransferTypes,
  DecString,
  HexString,
  NodeResponses,
  PublicResults,
  StoreTypes,
} from "@connext/types";
import { Injectable } from "@nestjs/common";
import { AddressZero, Zero } from "ethers/constants";
import { bigNumberify, formatEther, parseEther } from "ethers/utils";

import { ConfigService } from "../config/config.service";
import { LoggerService } from "../logger/logger.service";
import { getRandomBytes32 } from "../utils";

import { ChannelRecordRepository } from "./channel.repository";

@Injectable()
export class ChannelService {
  private channel: any;
  public tokenAddress: string;
  public swapRate: string;

  constructor(
    private readonly config: ConfigService,
    private readonly log: LoggerService,
    private readonly channelRecords: ChannelRecordRepository,
  ) {
    this.log.setContext("ChannelService");
    this.channel = new Promise(async (resolve, reject) => {

      const dbOpts = this.config.database;

      const store = getPostgresStore(
        `postgres://${dbOpts.username}:${dbOpts.password}@${dbOpts.host}:${dbOpts.port}/${dbOpts.database}`,
      );

      const channel = await connext({
        ...this.config.channel,
        store,
        loggerService: this.log.newContext("Connext"),
      });

      this.log.info(`Successfully connected to state channel!`);
      this.log.info(` - Multisig address: ${channel.multisigAddress}`);
      this.log.info(` - Bot signer address: ${channel.signerAddress}`);
      this.log.info(` - Bot public identifier: ${channel.publicIdentifier}`);
      this.log.info(` - Node signer address: ${channel.nodeSignerAddress}`);
      this.log.info(` - Node public identifier: ${channel.nodeIdentifier}`);

      this.tokenAddress = channel.config.contractAddresses.Token;
      this.log.info(` - Token address: ${this.tokenAddress}`);

      this.swapRate = await channel.getLatestSwapRate(AddressZero, this.tokenAddress),
      this.log.info(` - Swap rate: ${this.swapRate}`);

      channel.subscribeToSwapRates(AddressZero, this.tokenAddress, async res => {
        if (!res || !res.swapRate) { return; }
        const oldRate = this.swapRate;
        this.swapRate = res.swapRate;
        this.log.info(`Got swap rate upate: ${oldRate} -> ${this.swapRate}`);
      });

      let freeTokenBalance = await channel.getFreeBalance(this.tokenAddress);
      let freeEthBalance = await channel.getFreeBalance();

      if (freeTokenBalance[channel.nodeSignerAddress].eq(Zero)) {
        this.log.info(`Requesting collateral for ${this.tokenAddress}`);
        await channel.requestCollateral(this.tokenAddress);
        freeTokenBalance = await channel.getFreeBalance(this.tokenAddress);
      }

      this.log.info(` - Bot Free Balance: ${formatEther(freeEthBalance[channel.signerAddress])} ETH & ${formatEther(freeTokenBalance[channel.signerAddress])} Tokens`);
      this.log.info(` - Node Free Balance: ${formatEther(freeEthBalance[channel.nodeSignerAddress])} ETH & ${formatEther(freeTokenBalance[channel.nodeSignerAddress])} Tokens`);

      return resolve(channel);
    });
  }

  public async createPayment(amount: string): Promise<PublicResults.LinkedTransfer> {
    const channel = await this.channel;
    return channel.conditionalTransfer({
      assetId: this.tokenAddress,
      amount: parseEther(amount),
      conditionType: ConditionalTransferTypes.LinkedTransfer,
      paymentId: getRandomBytes32(),
      preImage: getRandomBytes32(),
    });
  }

  public async fetchPayment(
    paymentId: HexString,
  ): Promise<NodeResponses.GetLinkedTransfer> {
    const channel = await this.channel;
    return await channel.getLinkedTransfer(paymentId);
  }

  public async redeemPayment(
    paymentId: HexString,
    preImage: HexString,
  ): Promise<PublicResults.ResolveLinkedTransfer> {
    const channel = await this.channel;
    const result = await channel.resolveCondition({
      conditionType: ConditionalTransferTypes.LinkedTransfer,
      paymentId,
      preImage,
    });
    return result;
  }

  public async requestCollateral(token?: Address): Promise<void> {
    const channel = await this.channel;
    await channel.requestCollateral(token || this.tokenAddress);
  }

  public async getBalance(token?: Address): Promise<DecString> {
    const channel = await this.channel;
    return this.getFreeBalance(channel.signerAddress, token || this.tokenAddress);
  }

  public async getCollateral(token?: Address): Promise<DecString> {
    const channel = await this.channel;
    return this.getFreeBalance(channel.nodeSignerAddress, token || this.tokenAddress);
  }

  private async getFreeBalance(address: Address, token: Address): Promise<DecString> {
    const channel = await this.channel;
    const freeBalance = await channel.getFreeBalance(token);
    return formatEther(freeBalance[address]);
  }

}
