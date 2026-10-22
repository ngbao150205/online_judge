-- Record the RoadmapProgress model missing from earlier migration history.
-- Existing local databases may already have this table; never drop/recreate it.
CREATE TABLE IF NOT EXISTS "roadmap_progress" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "roadmapId" UUID NOT NULL,
    "problemId" UUID NOT NULL,
    "isSolved" BOOLEAN NOT NULL DEFAULT false,
    "solvedAt" TIMESTAMP(3),
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastSubmissionId" UUID,
    CONSTRAINT "roadmap_progress_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "roadmap_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "roadmap_progress_roadmapId_fkey" FOREIGN KEY ("roadmapId") REFERENCES "roadmaps"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "roadmap_progress_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "problems"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "roadmap_progress_lastSubmissionId_fkey" FOREIGN KEY ("lastSubmissionId") REFERENCES "submissions"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "roadmap_progress_userId_roadmapId_problemId_key" ON "roadmap_progress"("userId", "roadmapId", "problemId");
CREATE INDEX IF NOT EXISTS "roadmap_progress_userId_roadmapId_idx" ON "roadmap_progress"("userId", "roadmapId");
CREATE INDEX IF NOT EXISTS "roadmap_progress_roadmapId_problemId_idx" ON "roadmap_progress"("roadmapId", "problemId");
