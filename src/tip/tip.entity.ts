import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Tip {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column('text')
  sender!: string;

  @Column('text')
  recipient!: string;

  @Column('text')
  amount!: string;

  @Column('text')
  message!: string;
}
