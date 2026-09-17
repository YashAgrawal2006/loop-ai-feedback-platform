-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "contentJson" TEXT,
ADD COLUMN     "generatedById" TEXT,
ADD COLUMN     "periodEnd" TIMESTAMP(3),
ADD COLUMN     "periodStart" TIMESTAMP(3),
ALTER COLUMN "content" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Report_generatedById_idx" ON "Report"("generatedById");

-- CreateIndex
CREATE INDEX "Report_periodStart_periodEnd_idx" ON "Report"("periodStart", "periodEnd");

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
