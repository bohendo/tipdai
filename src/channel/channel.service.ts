import { connect as connext } from '@connext/client';
import { Injectable } from '@nestjs/common';
import { AddressZero, Zero } from 'ethers/constants';
import { formatEther, parseEther } from 'ethers/utils';

import { ConfigService } from '../config/config.service';

@Injectable()
export class ChannelService {
  private channel: any;
  private tokenAddress: string;
  private swapRate: string;

  constructor(private readonly config: ConfigService) {}

  public async getChannel(): Promise<any> {
    this.channel = await connext(await this.config.getChannelConfig());
    this.tokenAddress = (await this.channel.config()).contractAddresses.Token;
    this.swapRate = formatEther(
      await this.channel.getLatestSwapRate(AddressZero, this.tokenAddress),
    );

    this.channel.subscribeToSwapRates(AddressZero, this.tokenAddress, async res => {
      if (!res || !res.swapRate) { return; }
      const oldRate = this.swapRate;
      this.swapRate = formatEther(res.swapRate);
      console.log(`Got swap rate upate: ${oldRate} -> ${this.swapRate}`);
    });

    console.log(`Client created successfully!`);
    console.log(` - Public Identifier: ${this.channel.publicIdentifier}`);
    console.log(` - Account multisig address: ${this.channel.opts.multisigAddress}`);
    console.log(` - Free balance address: ${this.channel.freeBalanceAddress}`);
    console.log(` - Token address: ${this.tokenAddress}`);
    console.log(` - Swap rate: ${this.swapRate}`);

    console.log(`Creating a payment profile..`);
    await this.channel.addPaymentProfile({
      amountToCollateralize: parseEther('10').toString(),
      minimumMaintainedCollateral: parseEther('5').toString(),
      tokenAddress: this.tokenAddress,
    });

    const freeTokenBalance = await this.channel.getFreeBalance(this.tokenAddress);
    const hubFreeBalanceAddress = Object.keys(freeTokenBalance).filter(
      addr => addr.toLowerCase() !== this.channel.freeBalanceAddress,
    )[0];

    if (freeTokenBalance[hubFreeBalanceAddress].eq(Zero)) {
      console.log(`Requesting collateral for token ${this.tokenAddress}`);
      await this.channel.requestCollateral(this.tokenAddress);
    } else {
      console.log(
        `Hub has collateralized us with ${formatEther(
          freeTokenBalance[hubFreeBalanceAddress],
        )} tokens`,
      );
    }

    const botFreeBalance = freeTokenBalance[this.channel.freeBalanceAddress];
    // TODO: check bot's token & eth balance first
    if (botFreeBalance.eq(Zero)) {
      console.log(`Bot no tokens in its channel, depositing 10 now`);
      await this.channel.deposit({ amount: parseEther('10'), assetId: this.tokenAddress });
    } else {
      console.log(
        `Bot has a free balance of ${formatEther(botFreeBalance)} tokens`,
      );
    }

  }
}
