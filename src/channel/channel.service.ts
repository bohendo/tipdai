import { connect as connext } from '@connext/client';
import { Injectable } from '@nestjs/common';
import { AddressZero, Zero } from 'ethers/constants';
import { bigNumberify, formatEther, parseEther } from 'ethers/utils';

import { ConfigService } from '../config/config.service';
import { Logger } from '../utils';

import { ChannelRecordRepository } from './channel.repository';

@Injectable()
export class ChannelService {
  private channel: any;
  private log: Logger;
  public tokenAddress: string;
  public swapRate: string;

  constructor(
    private readonly config: ConfigService,
    private readonly channelRecords: ChannelRecordRepository,
  ) {
    this.log = new Logger('ChannelService', this.config.logLevel);
    this.channel = new Promise(async (resolve, reject) => {
      const channel = await connext({ ...this.config.channel, store: this.channelRecords });
      this.tokenAddress = channel.config.contractAddresses.Token;
      this.swapRate = await channel.getLatestSwapRate(AddressZero, this.tokenAddress),

      channel.subscribeToSwapRates(AddressZero, this.tokenAddress, async res => {
        if (!res || !res.swapRate) { return; }
        const oldRate = this.swapRate;
        this.swapRate = res.swapRate;
        this.log.info(`Got swap rate upate: ${oldRate} -> ${this.swapRate}`);
      });

      await channel.isAvailable();

      this.log.info(`Successfully connected to state channel!`);
      this.log.info(channel.publicIdentifier);
      this.log.info(` - Account multisig address: ${channel.multisigAddress}`);
      this.log.info(` - Signer address: ${channel.signerAddress}`);
      this.log.info(` - Token address: ${this.tokenAddress}`);
      this.log.info(` - Swap rate: ${this.swapRate}`);

      const freeTokenBalance = await channel.getFreeBalance(this.tokenAddress);
      const hubFreeBalanceAddress = Object.keys(freeTokenBalance).filter(
        addr => addr.toLowerCase() !== channel.signerAddress,
      )[0];

      if (freeTokenBalance[hubFreeBalanceAddress].eq(Zero)) {
        this.log.info(`Requesting collateral for $${this.tokenAddress}`);
        await channel.requestCollateral(this.tokenAddress);
      } else {
        this.log.info(
          `Hub has collateralized us with $${formatEther(
            freeTokenBalance[hubFreeBalanceAddress],
          )}`,
        );
      }

      const botFreeBalance = freeTokenBalance[channel.signerAddress];
      this.log.info(`Bot has a free balance of $${formatEther(botFreeBalance)}`);

      // TODO: check bot's token & eth balance first and maybe deposit a bit?
      return resolve(channel);
    });
  }

  public async getChannel(): Promise<any> {
    return await this.channel;
  }

}
