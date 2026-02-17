/*
  Warnings:

  - You are about to drop the column `attributes_snapshot` on the `product_variants` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "product_variants" DROP COLUMN "attributes_snapshot";
