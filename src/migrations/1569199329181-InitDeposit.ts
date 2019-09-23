import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitDeposit1569199329181 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`
          CREATE TABLE "deposit" (
            "id" SERIAL NOT NULL,
            "address" text NOT NULL,
            "amount" text NOT NULL,
            "oldBalance" text NOT NULL,
            "startTime" text NOT NULL,
            "userId" integer,
            CONSTRAINT "REL_b3f1383d11c01f2b6e63c37575" UNIQUE ("userId"),
            CONSTRAINT "PK_6654b4be449dadfd9d03a324b61" PRIMARY KEY ("id")
          )
        `);
        await queryRunner.query(`
          ALTER TABLE "deposit"
          ADD CONSTRAINT "FK_b3f1383d11c01f2b6e63c37575b"
          FOREIGN KEY ("userId")
          REFERENCES "user"("id")
          ON DELETE NO ACTION
          ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "deposit" DROP CONSTRAINT "FK_b3f1383d11c01f2b6e63c37575b"`);
        await queryRunner.query(`DROP TABLE "deposit"`);
    }

}
