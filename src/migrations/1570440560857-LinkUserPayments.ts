import { MigrationInterface, QueryRunner } from 'typeorm';

export class LinkUserPayments1570440560857 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`
          ALTER TABLE "user"
          DROP COLUMN "linkPayment"
        `, undefined);
        await queryRunner.query(`
          ALTER TABLE "payment"
          ADD "userId" integer
        `, undefined);
        await queryRunner.query(`
          ALTER TABLE "payment"
          ADD CONSTRAINT "UQ_b046318e0b341a7f72110b75857" UNIQUE ("userId")
        `, undefined);
        await queryRunner.query(`
          ALTER TABLE "payment"
          ADD CONSTRAINT "FK_b046318e0b341a7f72110b75857"
          FOREIGN KEY ("userId") REFERENCES "user"("id")
          ON DELETE NO ACTION ON UPDATE NO ACTION
        `, undefined);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`
          ALTER TABLE "payment"
          DROP CONSTRAINT "FK_b046318e0b341a7f72110b75857"
        `, undefined);
        await queryRunner.query(`
          ALTER TABLE "payment"
          DROP CONSTRAINT "UQ_b046318e0b341a7f72110b75857"
        `, undefined);
        await queryRunner.query(`
          ALTER TABLE "payment"
          DROP COLUMN "userId"
        `, undefined);
        await queryRunner.query(`
          ALTER TABLE "user"
          ADD "linkPayment" json NOT NULL
        `, undefined);
    }

}
