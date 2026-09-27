-- CreateEnum
CREATE TYPE "CheckerType" AS ENUM ('TOKENS', 'FLOAT');

-- AlterEnum
ALTER TYPE "SubmissionStatus" ADD VALUE 'SYSTEM_ERROR';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TestcaseStatus" ADD VALUE 'PENDING';
ALTER TYPE "TestcaseStatus" ADD VALUE 'CE';
ALTER TYPE "TestcaseStatus" ADD VALUE 'SYSTEM_ERROR';

-- AlterTable
ALTER TABLE "problems" ADD COLUMN     "checkerType" "CheckerType" NOT NULL DEFAULT 'TOKENS';

-- AlterTable
ALTER TABLE "submission_results" ADD COLUMN     "expectedOutput" TEXT,
ADD COLUMN     "output" TEXT,
ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "submissions" ADD COLUMN     "totalTestcases" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "resetPasswordExpires" TIMESTAMP(3),
ADD COLUMN     "resetPasswordToken" TEXT;

-- CreateTable
CREATE TABLE "roadmaps" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roadmaps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roadmap_problems" (
    "id" UUID NOT NULL,
    "roadmapId" UUID NOT NULL,
    "problemId" UUID NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "roadmap_problems_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roadmap_problems_roadmapId_problemId_key" ON "roadmap_problems"("roadmapId", "problemId");

-- AddForeignKey
ALTER TABLE "roadmap_problems" ADD CONSTRAINT "roadmap_problems_roadmapId_fkey" FOREIGN KEY ("roadmapId") REFERENCES "roadmaps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmap_problems" ADD CONSTRAINT "roadmap_problems_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "problems"("id") ON DELETE CASCADE ON UPDATE CASCADE;
