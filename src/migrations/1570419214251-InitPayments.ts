import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitPayments1570419214251 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`
          CREATE TABLE "payment" (
            "id" SERIAL NOT NULL,
            "twitterId" text NOT NULL,
            "paymentId" text NOT NULL,
            "secret" text NOT NULL,
            "amount" text NOT NULL,
            "status" text NOT NULL,
            CONSTRAINT "PK_fcaec7df5adf9cac408c686b2ab" PRIMARY KEY ("id")
          )
        `, undefined);
        await queryRunner.query(`
          ALTER TABLE "deposit"
          ALTER COLUMN "amount" DROP NOT NULL
        `, undefined);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`
          ALTER TABLE "deposit"
          ALTER COLUMN "amount" SET NOT NULL
        `, undefined);
        await queryRunner.query(`
          DROP TABLE "payment"
        `, undefined);
    }

}
