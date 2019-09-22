import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Deposit {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column('citext')
  address!: string;

  @Column('citext')
  amount!: string;

  @Column('citext')
  startTime!: Date;

  @Column('citext')
  user!: string;

  @Column('citext')
  oldBalance!: string;
}
