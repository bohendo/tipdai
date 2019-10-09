import {MigrationInterface, QueryRunner} from "typeorm";

export class InitTip1570646855257 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`CREATE TABLE "tip" ("id" SERIAL NOT NULL, "sender" text NOT NULL, "recipient" text NOT NULL, "amount" text NOT NULL, "message" text NOT NULL, CONSTRAINT "PK_855d736988802b4ec0e07b7e762" PRIMARY KEY ("id"))`, undefined);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`DROP TABLE "tip"`, undefined);
    }

}
