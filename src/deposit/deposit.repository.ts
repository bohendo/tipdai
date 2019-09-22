import { EntityRepository, Repository } from 'typeorm';

import { Deposit } from './deposit.entity';

@EntityRepository(Deposit)
export class DepositRepository extends Repository<Deposit> {
  async findByUser(user): Promise<Deposit | undefined> {
    return await this.findOne({
      where: { user },
    });
  }
}
