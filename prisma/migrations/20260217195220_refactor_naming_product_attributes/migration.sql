/*
  Warnings:

  - You are about to drop the column `attribute_id` on the `attribute_categories` table. All the data in the column will be lost.
  - You are about to drop the column `value` on the `attribute_categories` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `attributes` table. All the data in the column will be lost.
  - You are about to drop the column `attribute_category_id` on the `variant_attribute_categories` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[variant_id,attribute_id]` on the table `variant_attribute_categories` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `name` to the `attribute_categories` table without a default value. This is not possible if the table is not empty.
  - Added the required column `attribute_category_id` to the `attributes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `value` to the `attributes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `attribute_id` to the `variant_attribute_categories` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "attribute_categories" DROP CONSTRAINT "attribute_categories_attribute_id_fkey";

-- DropForeignKey
ALTER TABLE "variant_attribute_categories" DROP CONSTRAINT "variant_attribute_categories_attribute_category_id_fkey";

-- DropIndex
DROP INDEX "variant_attribute_categories_variant_id_attribute_category__key";

-- AlterTable
ALTER TABLE "attribute_categories" DROP COLUMN "attribute_id",
DROP COLUMN "value",
ADD COLUMN     "name" VARCHAR NOT NULL;

-- AlterTable
ALTER TABLE "attributes" DROP COLUMN "name",
ADD COLUMN     "attribute_category_id" UUID NOT NULL,
ADD COLUMN     "value" VARCHAR NOT NULL;

-- AlterTable
ALTER TABLE "variant_attribute_categories" DROP COLUMN "attribute_category_id",
ADD COLUMN     "attribute_id" UUID NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "variant_attribute_categories_variant_id_attribute_id_key" ON "variant_attribute_categories"("variant_id", "attribute_id");

-- AddForeignKey
ALTER TABLE "attributes" ADD CONSTRAINT "attributes_attribute_category_id_fkey" FOREIGN KEY ("attribute_category_id") REFERENCES "attribute_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variant_attribute_categories" ADD CONSTRAINT "variant_attribute_categories_attribute_id_fkey" FOREIGN KEY ("attribute_id") REFERENCES "attributes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
