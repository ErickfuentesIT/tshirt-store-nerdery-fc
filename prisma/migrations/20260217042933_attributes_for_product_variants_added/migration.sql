-- CreateTable
CREATE TABLE "attributes" (
    "id" UUID NOT NULL,
    "name" VARCHAR NOT NULL,

    CONSTRAINT "attributes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attribute_categories" (
    "id" UUID NOT NULL,
    "attribute_id" UUID NOT NULL,
    "value" VARCHAR NOT NULL,

    CONSTRAINT "attribute_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "variant_attribute_categories" (
    "id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "attribute_category_id" UUID NOT NULL,

    CONSTRAINT "variant_attribute_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "variant_attribute_categories_variant_id_attribute_category__key" ON "variant_attribute_categories"("variant_id", "attribute_category_id");

-- AddForeignKey
ALTER TABLE "attribute_categories" ADD CONSTRAINT "attribute_categories_attribute_id_fkey" FOREIGN KEY ("attribute_id") REFERENCES "attributes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variant_attribute_categories" ADD CONSTRAINT "variant_attribute_categories_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variant_attribute_categories" ADD CONSTRAINT "variant_attribute_categories_attribute_category_id_fkey" FOREIGN KEY ("attribute_category_id") REFERENCES "attribute_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
