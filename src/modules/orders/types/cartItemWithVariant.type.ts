
export type CartItemWithVariant = {
  productVariantId: string;
  quantity: number;
  productVariant: {
    priceCents: number;
    stock: number;
    sku: string;
  };
};