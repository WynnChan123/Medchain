/*
  Warnings:

  - A unique constraint covering the columns `[address]` on the table `Organization` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Organization_address_key" ON "Organization"("address");
