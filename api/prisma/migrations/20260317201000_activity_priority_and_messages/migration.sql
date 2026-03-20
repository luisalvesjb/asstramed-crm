-- AlterTable
ALTER TABLE "Activity"
ADD COLUMN "priority" "MessagePriority" NOT NULL DEFAULT 'MEDIA';

-- CreateTable
CREATE TABLE "ActivityMessage" (
  "id" TEXT NOT NULL,
  "activityId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),

  CONSTRAINT "ActivityMessage_pkey" PRIMARY KEY ("id")
);

-- Index
CREATE INDEX "ActivityMessage_activityId_createdAt_idx" ON "ActivityMessage"("activityId", "createdAt");

-- Foreign keys
ALTER TABLE "ActivityMessage" ADD CONSTRAINT "ActivityMessage_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ActivityMessage" ADD CONSTRAINT "ActivityMessage_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
