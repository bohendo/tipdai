import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitDeposit1569186916275 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`
      CREATE TABLE "deposit" (
        "id" SERIAL NOT NULL,
        "address" citext NOT NULL,
        "amount" citext NOT NULL,
        "startTime" citext NOT NULL,
        "user" citext NOT NULL,
        "oldBalance" citext NOT NULL,
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
