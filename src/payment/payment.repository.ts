import { EntityRepository, Repository } from 'typeorm';

import { Payment } from './payment.entity';

@EntityRepository(Payment)
export class PaymentRepository extends Repository<Payment> {
  async findByPaymentId(paymentId): Promise<Payment | undefined> {
    return await this.findOne({ where: { paymentId } });
  }
}
