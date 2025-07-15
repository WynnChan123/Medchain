/*
  Warnings:

  - You are about to drop the column `publicKey` on the `User` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "User_publicKey_idx";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "publicKey";

-- CreateTable
CREATE TABLE "PublicKey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,

    CONSTRAINT "PublicKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PublicKey_userId_idx" ON "PublicKey"("userId");

-- AddForeignKey
ALTER TABLE "PublicKey" ADD CONSTRAINT "PublicKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
