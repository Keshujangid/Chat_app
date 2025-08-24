-- CreateTable
CREATE TABLE "user_friends" (
    "userId" UUID NOT NULL,
    "friendId" UUID NOT NULL,

    CONSTRAINT "user_friends_pkey" PRIMARY KEY ("userId","friendId")
);

-- CreateIndex
CREATE INDEX "conversations_last_message_at_idx" ON "conversations"("last_message_at" DESC);

-- AddForeignKey
ALTER TABLE "user_friends" ADD CONSTRAINT "user_friends_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_friends" ADD CONSTRAINT "user_friends_friendId_fkey" FOREIGN KEY ("friendId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
