import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

import { User } from '../user/user.entity';

@Entity()
export class Payment {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column('text')
  twitterId!: string;

  @Column('text')
  paymentId!: string;

  @Column('text')
  secret!: string;

  @Column('text')
  amount!: string;

  @Column('text')
  status!: string;
}
