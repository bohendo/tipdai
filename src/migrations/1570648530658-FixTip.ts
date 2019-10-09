import {MigrationInterface, QueryRunner} from "typeorm";

export class FixTip1570648530658 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "tip" DROP COLUMN "sender"`, undefined);
        await queryRunner.query(`ALTER TABLE "tip" DROP COLUMN "recipient"`, undefined);
        await queryRunner.query(`ALTER TABLE "tip" ADD "senderId" integer`, undefined);
        await queryRunner.query(`ALTER TABLE "tip" ADD "recipientId" integer`, undefined);
        await queryRunner.query(`ALTER TABLE "tip" ADD CONSTRAINT "FK_b35733d3c17dfb38bc8462cb4c8" FOREIGN KEY ("senderId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
        await queryRunner.query(`ALTER TABLE "tip" ADD CONSTRAINT "FK_08022096780ceb68a4ac73f73ee" FOREIGN KEY ("recipientId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "tip" DROP CONSTRAINT "FK_08022096780ceb68a4ac73f73ee"`, undefined);
        await queryRunner.query(`ALTER TABLE "tip" DROP CONSTRAINT "FK_b35733d3c17dfb38bc8462cb4c8"`, undefined);
        await queryRunner.query(`ALTER TABLE "tip" DROP COLUMN "recipientId"`, undefined);
        await queryRunner.query(`ALTER TABLE "tip" DROP COLUMN "senderId"`, undefined);
        await queryRunner.query(`ALTER TABLE "tip" ADD "recipient" text NOT NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "tip" ADD "sender" text NOT NULL`, undefined);
    }

}
