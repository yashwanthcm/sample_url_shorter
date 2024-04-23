/*
  Warnings:

  - Added the required column `original_url` to the `Url` table without a default value. This is not possible if the table is not empty.
  - Added the required column `short_url` to the `Url` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Url" ADD COLUMN     "original_url" TEXT NOT NULL,
ADD COLUMN     "short_url" TEXT NOT NULL;
