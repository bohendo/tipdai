import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { User } from '../user/user.entity';

@Entity()
export class Tip {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(type => User, { cascade: true })
  sender: User;

  @ManyToOne(type => User, { cascade: true })
  recipient: User;

  @Column('text')
  amount!: string;

  @Column('text')
  message!: string;
}
