import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLinkUrl1570441718465 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`
          ALTER TABLE "payment"
          ADD "baseUrl" text NOT NULL
        `, undefined);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`
          ALTER TABLE "payment"
          DROP COLUMN "baseUrl"
        `, undefined);
    }

}
