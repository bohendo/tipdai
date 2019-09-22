import { EntityRepository, Repository } from 'typeorm';

import { User } from './user.entity';

@EntityRepository(User)
export class UserRepository extends Repository<User> {
  async findByTwitterId(twitterId): Promise<User | undefined> {
    return await this.findOne({
      where: { twitterId },
    });
  }
}
