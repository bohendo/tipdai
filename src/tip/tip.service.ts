import { Injectable } from '@nestjs/common';

import { User } from '../user/user.entity';
import { UserRepository } from '../user/user.repository';

import { Tip } from './tip.entity';

@Injectable()
export class TipService {
  constructor(
    private readonly userRepo: UserRepository,
  ) {}

  public handleTip = async (sender: User, recipient: User, amount: string) => {
    try {
      console.log(`Handling tip from ${sender.twitterId} to ${recipient.twitterId} amount ${amount}`);

      /*
      if (!sender.balance || parseEther(sender.balance).lt(parseEther(amount))) {
        console.log(`sender balance ${sender.balance} is lower than ${amount}`);
        return; // TODO: this.twitter.tweet('hey sender you need more money')
      }
      */

      return 'true';
    } catch (e) {
      console.log(`Failed to handling tip: ${e}`);
      return 'false';
    }
  }

}
