import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitChannelRecords1569189365938 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`
      CREATE TABLE "channel_records" (
        "path" character varying NOT NULL,
        "value" json NOT NULL,
        CONSTRAINT "PK_af64752e84cbc6ec5503d1fe1ef" PRIMARY KEY ("path")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`
      DROP TABLE "channel_records"
    `);
  }

}
