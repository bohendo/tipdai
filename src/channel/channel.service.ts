import { connect as connext } from '@connext/client';
import { Injectable } from '@nestjs/common';
import { AddressZero, Zero } from 'ethers/constants';
import { formatEther, parseEther } from 'ethers/utils';

import { ConfigService } from '../config/config.service';

import { ChannelRecordRepository } from './channel.repository';

@Injectable()
export class ChannelService {
  private channel: any;
  private tokenAddress: string;
  private swapRate: string;

  constructor(
    private readonly config: ConfigService,
    private readonly channelRecords: ChannelRecordRepository,
  ) {
    this.connectChannel();
  }

  public async getChannel(): Promise<any> {
    return await this.channel;
  }

  public async connectChannel(): Promise<any> {
    this.channel = new Promise(async (resolve, reject) => {
      const channel = await connext({ ...this.config.channel, store: this.channelRecords });
      this.tokenAddress = (await channel.config()).contractAddresses.Token;
      this.swapRate = await channel.getLatestSwapRate(AddressZero, this.tokenAddress),

      channel.subscribeToSwapRates(AddressZero, this.tokenAddress, async res => {
        if (!res || !res.swapRate) { return; }
        const oldRate = this.swapRate;
        this.swapRate = res.swapRate;
        console.log(`Got swap rate upate: ${oldRate} -> ${this.swapRate}`);
      });

      console.log(`Client created successfully!`);
      console.log(` - Public Identifier: ${channel.publicIdentifier}`);
      console.log(` - Account multisig address: ${channel.opts.multisigAddress}`);
      console.log(` - Free balance address: ${channel.freeBalanceAddress}`);
      console.log(` - Token address: ${this.tokenAddress}`);
      console.log(` - Swap rate: ${this.swapRate}`);

      console.log(`Creating a payment profile..`);
      await channel.addPaymentProfile({
        amountToCollateralize: parseEther('10').toString(),
        minimumMaintainedCollateral: parseEther('5').toString(),
        assetId: this.tokenAddress,
      });

      const freeTokenBalance = await channel.getFreeBalance(this.tokenAddress);
      const hubFreeBalanceAddress = Object.keys(freeTokenBalance).filter(
        addr => addr.toLowerCase() !== channel.freeBalanceAddress,
      )[0];

      if (freeTokenBalance[hubFreeBalanceAddress].eq(Zero)) {
        console.log(`Requesting collateral for token ${this.tokenAddress}`);
        await channel.requestCollateral(this.tokenAddress);
      } else {
        console.log(
          `Hub has collateralized us with ${formatEther(
            freeTokenBalance[hubFreeBalanceAddress],
          )} tokens`,
        );
      }

      const botFreeBalance = freeTokenBalance[channel.freeBalanceAddress];
      console.log(`Bot has a free balance of ${formatEther(botFreeBalance)} tokens`);

      // TODO: check bot's token & eth balance first and maybe deposit a bit?
      return resolve(channel);
    });
  }
}
