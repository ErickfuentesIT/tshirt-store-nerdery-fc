/*
  Warnings:

  - You are about to drop the column `value` on the `attributes` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[code]` on the table `attributes` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `code` to the `attributes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `displayName` to the `attributes` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "attributes" DROP COLUMN "value",
ADD COLUMN     "code" VARCHAR NOT NULL,
ADD COLUMN     "displayName" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "attributes_code_key" ON "attributes"("code");

-- CreateIndex
CREATE INDEX "attributes_attribute_category_id_idx" ON "attributes"("attribute_category_id");

-- CreateIndex
CREATE INDEX "product_variants_product_id_is_active_idx" ON "product_variants"("product_id", "is_active");

-- CreateIndex
CREATE INDEX "variant_attribute_categories_attribute_id_idx" ON "variant_attribute_categories"("attribute_id");
