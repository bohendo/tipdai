import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

import { User } from '../user/user.entity';

@Entity()
export class Deposit {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column('text')
  address!: string;

  @Column('text')
  amount: string;

  @Column('text')
  oldBalance!: string;

  @Column('text')
  startTime!: Date;

  @OneToOne(type => User)
  @JoinColumn()
  user: User;
}
