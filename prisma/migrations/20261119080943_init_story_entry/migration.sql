-- CreateTable
CREATE TABLE "StoryEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "publicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "story" TEXT NOT NULL,
    "consent" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'pending_review',
    "aiDecision" TEXT,
    "aiCategory" TEXT,
    "aiCaption" TEXT,
    "aiReason" TEXT,
    "aiRawResponse" TEXT,
    "adminOverride" BOOLEAN NOT NULL DEFAULT false,
    "adminNotes" TEXT,
    "adminUser" TEXT,
    "overriddenAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "StoryEntry_publicId_key" ON "StoryEntry"("publicId");

-- CreateIndex
CREATE INDEX "StoryEntry_status_idx" ON "StoryEntry"("status");

-- CreateIndex
CREATE INDEX "StoryEntry_createdAt_idx" ON "StoryEntry"("createdAt");
