import { connect as connext } from '@connext/client';
import { Injectable } from '@nestjs/common';
import { AddressZero, Zero } from 'ethers/constants';
import { formatEther, parseEther } from 'ethers/utils';

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

      // Wait for channel to be available
      const channelIsAvailable = async () => {
        const chan = await channel.getChannel();
        return chan && chan.available;
      };
      while (!(await channelIsAvailable())) {
        await new Promise(res => setTimeout(() => res(), 1000));
      }

      this.log.info(`Client created successfully!`);
      this.log.info(` - Public Identifier: ${channel.publicIdentifier}`);
      this.log.info(` - Account multisig address: ${channel.opts.multisigAddress}`);
      this.log.info(` - Free balance address: ${channel.freeBalanceAddress}`);
      this.log.info(` - Token address: ${this.tokenAddress}`);
      this.log.info(` - Swap rate: ${this.swapRate}`);

      try {
        const fb = await channel.getFreeBalance(this.tokenAddress);
        this.log.info(`Free balance: ${JSON.stringify(fb)}, creating a payment profile..`);
        await channel.addPaymentProfile({
          amountToCollateralize: parseEther('10').toString(),
          minimumMaintainedCollateral: parseEther('5').toString(),
          assetId: this.tokenAddress,
        });
      } catch (e) {
        if (e.message.includes('StateChannel does not exist yet')) {
          this.log.info(`State channel state is missing, attempting to restore..`);
          await channel.restoreStateFromNode(this.config.wallet.mnemonic);
          this.log.info(`State successfully restored!`);
        }
      }

      const freeTokenBalance = await channel.getFreeBalance(this.tokenAddress);
      const hubFreeBalanceAddress = Object.keys(freeTokenBalance).filter(
        addr => addr.toLowerCase() !== channel.freeBalanceAddress,
      )[0];

      if (freeTokenBalance[hubFreeBalanceAddress].eq(Zero)) {
        this.log.info(`Requesting collateral for token ${this.tokenAddress}`);
        await channel.requestCollateral(this.tokenAddress);
      } else {
        this.log.info(
          `Hub has collateralized us with ${formatEther(
            freeTokenBalance[hubFreeBalanceAddress],
          )} tokens`,
        );
      }

      const botFreeBalance = freeTokenBalance[channel.freeBalanceAddress];
      this.log.info(`Bot has a free balance of ${formatEther(botFreeBalance)} tokens`);

      // TODO: check bot's token & eth balance first and maybe deposit a bit?
      return resolve(channel);
    });
  }

  public async getChannel(): Promise<any> {
    return await this.channel;
  }

}
