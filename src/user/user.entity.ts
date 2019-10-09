import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

import { Payment } from '../payment/payment.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column('text')
  twitterId!: string;

  @Column('text')
  balance!: string;

  @OneToOne(type => Payment)
  @JoinColumn()
  cashout: Payment;
}
