import { EntityRepository, IsNull, Not, Repository } from "typeorm";

import { Deposit } from "./deposit.entity";

@EntityRepository(Deposit)
export class DepositRepository extends Repository<Deposit> {
  async findBy(user): Promise<Deposit | undefined> {
    return await this.findOne({
      where: { user },
    });
  }

  async getAllPending(): Promise<Deposit[] | undefined> {
    return await this.find({
      where: { amount: Not(IsNull()) },
    });
  }
}
