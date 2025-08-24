/*
  Warnings:

  - You are about to drop the column `image_url` on the `messages` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[last_message_id]` on the table `conversations` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "messages" DROP COLUMN "image_url",
ADD COLUMN     "file_name" TEXT,
ADD COLUMN     "file_size" INTEGER,
ADD COLUMN     "file_type" TEXT,
ADD COLUMN     "file_url" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "conversations_last_message_id_key" ON "conversations"("last_message_id");
