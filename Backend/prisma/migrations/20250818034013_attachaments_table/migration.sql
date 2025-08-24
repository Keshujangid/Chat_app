/*
  Warnings:

  - You are about to drop the column `file_name` on the `messages` table. All the data in the column will be lost.
  - You are about to drop the column `file_size` on the `messages` table. All the data in the column will be lost.
  - You are about to drop the column `file_type` on the `messages` table. All the data in the column will be lost.
  - You are about to drop the column `file_url` on the `messages` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "AttachmentType" AS ENUM ('IMAGE', 'VIDEO', 'AUDIO', 'FILE');

-- AlterTable
ALTER TABLE "messages" DROP COLUMN "file_name",
DROP COLUMN "file_size",
DROP COLUMN "file_type",
DROP COLUMN "file_url";

-- CreateTable
CREATE TABLE "attachments" (
    "id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "name" TEXT,
    "mime_type" TEXT,
    "type" "AttachmentType" NOT NULL DEFAULT 'FILE',
    "file_size" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "attachments_message_id_idx" ON "attachments"("message_id");

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
