import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { User } from '../user/user.entity';

@Entity()
export class Payment {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column('text')
  paymentId!: string;

  @Column('text')
  secret!: string;

  @Column('text')
  amount!: string;

  @ManyToOne(type => User)
  sender: User;

  @ManyToOne(type => User)
  recipient: User;

  @Column('text')
  status!: string;
}
