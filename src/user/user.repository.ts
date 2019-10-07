import { EntityRepository, Repository } from 'typeorm';

import { User } from './user.entity';

@EntityRepository(User)
export class UserRepository extends Repository<User> {
  async initUser(twitterId: string): Promise<User> {
    const user = new User();
    user.twitterId = twitterId;
    user.balance = '0.00';
    await this.save(user);
    console.log(`Saved new user: ${JSON.stringify(user)}`);
    return user;
  }

  async getByTwitterId(twitterId): Promise<User> {
    return await this.findOne({ where: { twitterId } }) || this.initUser(twitterId);
  }
}
