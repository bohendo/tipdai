import {MigrationInterface, QueryRunner} from "typeorm";

export class LinkUserPayment1570642369091 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "user" ADD "cashoutId" integer`, undefined);
        await queryRunner.query(`ALTER TABLE "user" ADD CONSTRAINT "UQ_e3987f6cab0074e9f2c85e38db9" UNIQUE ("cashoutId")`, undefined);
        await queryRunner.query(`ALTER TABLE "user" ADD CONSTRAINT "FK_e3987f6cab0074e9f2c85e38db9" FOREIGN KEY ("cashoutId") REFERENCES "payment"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "FK_e3987f6cab0074e9f2c85e38db9"`, undefined);
        await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "UQ_e3987f6cab0074e9f2c85e38db9"`, undefined);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "cashoutId"`, undefined);
    }

}
