import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTwitterName1571652347467 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`
          ALTER TABLE "user" ADD "address" text
        `, undefined);
        await queryRunner.query(`
          ALTER TABLE "user" ADD "twitterName" text
        `, undefined);
        await queryRunner.query(`
          ALTER TABLE "user" ALTER COLUMN "twitterId" DROP NOT NULL
        `, undefined);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`
          ALTER TABLE "user" ALTER COLUMN "twitterId" SET NOT NULL
        `, undefined);
        await queryRunner.query(`
          ALTER TABLE "user" DROP COLUMN "twitterName"
        `, undefined);
        await queryRunner.query(`
          ALTER TABLE "user" DROP COLUMN "address"
        `, undefined);
    }

}
