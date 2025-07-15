/*
  Warnings:

  - A unique constraint covering the columns `[publicKey]` on the table `PublicKey` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "PublicKey_publicKey_key" ON "PublicKey"("publicKey");
