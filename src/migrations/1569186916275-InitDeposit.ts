import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitDeposit1569186916275 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`
      CREATE TABLE "deposit" (
        "id" SERIAL NOT NULL,
        "address" text NOT NULL,
        "amount" text NOT NULL,
        "startTime" text NOT NULL,
        "user" text NOT NULL,
        "oldBalance" text NOT NULL,
        CONSTRAINT "PK_6654b4be449dadfd9d03a324b61" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`
      DROP TABLE "deposit"
    `);
  }

}
