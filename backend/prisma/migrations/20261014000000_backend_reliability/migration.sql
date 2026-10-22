ALTER TABLE "users" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "categories" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "problems" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "testcaseVersion" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "testcases" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "roadmaps" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "submissions" ADD COLUMN "deadlineAt" TIMESTAMP(3), ADD COLUMN "testcaseVersion" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "submission_results" ALTER COLUMN "memoryUsed" DROP NOT NULL, ALTER COLUMN "memoryUsed" DROP DEFAULT,
 ADD COLUMN "cpuTime" INTEGER, ADD COLUMN "compileTime" INTEGER;
-- Zero from legacy workers means unmeasured, not a measured zero-byte workload.
UPDATE "submission_results" SET "memoryUsed" = NULL WHERE "memoryUsed" = 0;
CREATE INDEX "submissions_status_deadlineAt_idx" ON "submissions"("status", "deadlineAt");
CREATE INDEX "submissions_userId_status_problemId_idx" ON "submissions"("userId", "status", "problemId");
CREATE INDEX "submissions_createdAt_idx" ON "submissions"("createdAt");
CREATE TABLE "auth_sessions" (
 "id" UUID PRIMARY KEY, "userId" UUID NOT NULL, "tokenVersion" INTEGER NOT NULL,
 "expiresAt" TIMESTAMP(3) NOT NULL, "revokedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "auth_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "auth_sessions_userId_expiresAt_idx" ON "auth_sessions"("userId", "expiresAt");
CREATE TABLE "outbox_jobs" (
 "id" UUID PRIMARY KEY, "submissionId" UUID NOT NULL, "payload" JSONB NOT NULL, "attempts" INTEGER NOT NULL DEFAULT 0,
 "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "leaseUntil" TIMESTAMP(3), "leaseToken" UUID,
 "sentAt" TIMESTAMP(3), "cancelledAt" TIMESTAMP(3), "lastError" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "outbox_jobs_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "outbox_jobs_sentAt_cancelledAt_availableAt_idx" ON "outbox_jobs"("sentAt", "cancelledAt", "availableAt");
CREATE INDEX "outbox_jobs_submissionId_idx" ON "outbox_jobs"("submissionId");
ALTER TABLE "submissions" DROP CONSTRAINT "submissions_userId_fkey";
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "submissions" DROP CONSTRAINT "submissions_problemId_fkey";
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "problems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "submission_results" DROP CONSTRAINT "submission_results_submissionId_fkey";
ALTER TABLE "submission_results" ADD CONSTRAINT "submission_results_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "submission_results" DROP CONSTRAINT "submission_results_testcaseId_fkey";
ALTER TABLE "submission_results" ADD CONSTRAINT "submission_results_testcaseId_fkey" FOREIGN KEY ("testcaseId") REFERENCES "testcases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ai_logs" DROP CONSTRAINT "ai_logs_submissionId_fkey";
ALTER TABLE "ai_logs" ADD CONSTRAINT "ai_logs_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "roadmap_progress" DROP CONSTRAINT "roadmap_progress_userId_fkey";
ALTER TABLE "roadmap_progress" ADD CONSTRAINT "roadmap_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "roadmap_progress" DROP CONSTRAINT "roadmap_progress_roadmapId_fkey";
ALTER TABLE "roadmap_progress" ADD CONSTRAINT "roadmap_progress_roadmapId_fkey" FOREIGN KEY ("roadmapId") REFERENCES "roadmaps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "roadmap_progress" DROP CONSTRAINT "roadmap_progress_problemId_fkey";
ALTER TABLE "roadmap_progress" ADD CONSTRAINT "roadmap_progress_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "problems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
