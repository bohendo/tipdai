import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('channel_records')
export class ChannelRecord {
  @PrimaryColumn()
  path!: string;

  @Column({ type: 'json' })
  value!: object;
}
