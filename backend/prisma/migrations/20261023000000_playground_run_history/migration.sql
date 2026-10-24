CREATE TABLE "playground_runs" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "problemId" UUID,
  "problemTitle" TEXT,
  "language" TEXT NOT NULL,
  "sourceCode" TEXT NOT NULL,
  "customInput" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "output" TEXT,
  "error" TEXT,
  "executionTime" INTEGER,
  "memoryUsed" INTEGER,
  "cpuTime" INTEGER,
  "compileTime" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "deadlineAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "playground_runs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "playground_runs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "playground_runs_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "problems"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "playground_runs_userId_createdAt_idx" ON "playground_runs"("userId", "createdAt");
CREATE INDEX "playground_runs_status_deadlineAt_idx" ON "playground_runs"("status", "deadlineAt");
