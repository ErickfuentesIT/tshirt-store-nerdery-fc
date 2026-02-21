export type LowStockNotificationJob = {
  variantId:   string;
  productName: string;
  imageUrl:    string | null;
  oldStock:    number;
  newStock:    number;
}
