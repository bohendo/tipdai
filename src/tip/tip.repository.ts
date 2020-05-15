import { EntityRepository, Repository } from "typeorm";

import { Tip } from "./tip.entity";

@EntityRepository(Tip)
export class TipRepository extends Repository<Tip> {
  async findBySender(sender: number): Promise<Tip | undefined> {
    return await this.findOne({ where: { sender } });
  }
}
