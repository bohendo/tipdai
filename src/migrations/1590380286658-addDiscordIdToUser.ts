import {MigrationInterface, QueryRunner} from "typeorm";

export class addDiscordIdToUser1590380286658 implements MigrationInterface {
    name = 'addDiscordIdToUser1590380286658'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ADD "discordId" text`, undefined);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "discordId"`, undefined);
    }

}
