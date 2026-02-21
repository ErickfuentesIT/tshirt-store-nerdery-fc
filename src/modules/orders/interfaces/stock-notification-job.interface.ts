export interface LowStockNotificationJob {
  variantId:   string;
  productName: string;
  imageUrl:    string | null;
  newStock:    number;
}
