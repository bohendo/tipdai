import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitPayment1570607826598 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`
          CREATE TABLE "payment" (
            "id" SERIAL NOT NULL,
            "paymentId" text NOT NULL,
            "secret" text NOT NULL,
            "amount" text NOT NULL,
            "status" text NOT NULL,
            "senderId" integer,
            "recipientId" integer,
            CONSTRAINT "PK_fcaec7df5adf9cac408c686b2ab" PRIMARY KEY ("id")
          )
        `, undefined);
        await queryRunner.query(`
          ALTER TABLE "payment"
          ADD CONSTRAINT "FK_07d0260210e4a41a97aaa077a3d"
          FOREIGN KEY ("senderId") REFERENCES "user"("id")
          ON DELETE NO ACTION ON UPDATE NO ACTION
        `, undefined);
        await queryRunner.query(`
          ALTER TABLE "payment"
          ADD CONSTRAINT "FK_5a18e089eca6a2d84cfe3f313d9"
          FOREIGN KEY ("recipientId") REFERENCES "user"("id")
          ON DELETE NO ACTION ON UPDATE NO ACTION
        `, undefined);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`
          ALTER TABLE "payment" DROP CONSTRAINT "FK_5a18e089eca6a2d84cfe3f313d9"
        `, undefined);
        await queryRunner.query(`
          ALTER TABLE "payment" DROP CONSTRAINT "FK_07d0260210e4a41a97aaa077a3d"
        `, undefined);
        await queryRunner.query(`
          DROP TABLE "payment"
        `, undefined);
    }

}
