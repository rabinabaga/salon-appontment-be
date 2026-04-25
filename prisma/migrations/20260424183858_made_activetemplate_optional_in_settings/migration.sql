-- DropForeignKey
ALTER TABLE "Settings" DROP CONSTRAINT "Settings_activeTemplateId_fkey";

-- DropIndex
DROP INDEX "Settings_activeTemplateId_key";

-- AlterTable
ALTER TABLE "Settings" ALTER COLUMN "activeTemplateId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Settings" ADD CONSTRAINT "Settings_activeTemplateId_fkey" FOREIGN KEY ("activeTemplateId") REFERENCES "NotificationTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
