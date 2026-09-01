/*
  Warnings:

  - You are about to drop the `_CategoryToProblem` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `name` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "_CategoryToProblem" DROP CONSTRAINT "_CategoryToProblem_A_fkey";

-- DropForeignKey
ALTER TABLE "_CategoryToProblem" DROP CONSTRAINT "_CategoryToProblem_B_fkey";

-- AlterTable
ALTER TABLE "submissions" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "name" TEXT NOT NULL;

-- DropTable
DROP TABLE "_CategoryToProblem";

-- CreateTable
CREATE TABLE "problem_categories" (
    "problemId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,

    CONSTRAINT "problem_categories_pkey" PRIMARY KEY ("problemId","categoryId")
);

-- AddForeignKey
ALTER TABLE "problem_categories" ADD CONSTRAINT "problem_categories_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "problems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "problem_categories" ADD CONSTRAINT "problem_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
