import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Deposit {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column('text')
  address!: string;

  @Column('text')
  amount!: string;

  @Column('text')
  startTime!: Date;

  @Column('text')
  user!: string;

  @Column('text')
  oldBalance!: string;
}
