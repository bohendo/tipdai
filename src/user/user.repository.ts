import { EntityRepository, Repository } from 'typeorm';

import { User } from './user.entity';

@EntityRepository(User)
export class UserRepository extends Repository<User> {

  async getAddressUser(address: string): Promise<User> {
    let user = await this.findOne({ where: { address } });
    if (!user) {
      user = await this.create({ address });
      await this.save(user);
    }
    return user;
  }

  async getTwitterUser(twitterId: string, twitterName?: string): Promise<User> {
    let user = await this.findOne({ where: { twitterId } });
    let shouldSave = false;
    if (!user) {
      user = await this.create({ twitterId });
      shouldSave = true;
    }
    if (twitterName && !user.twitterName) {
      user.twitterName = twitterName;
      shouldSave = true;
    }
    if (shouldSave) {
      await this.save(user);
    }
    return user;
  }

}
