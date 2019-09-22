import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column('text')
  twitterId!: string;

  @Column('text')
  balance!: string;

  @Column('json')
  linkPayment: string;
}
