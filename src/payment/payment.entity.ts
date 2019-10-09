import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

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

  @ManyToOne(type => User, { cascade: true })
  sender: User;

  @ManyToOne(type => User, { cascade: true })
  recipient: User;

  @Column('text')
  status!: string;
}
