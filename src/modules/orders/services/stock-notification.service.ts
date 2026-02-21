import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  NOTIFY_LOW_STOCK_JOB,
  STOCK_NOTIFICATION_QUEUE,
} from './../constants/queue.constants.js';
import type { LowStockNotificationJob } from './../types/stock-notification-job.type.js';

@Injectable()
export class StockNotificationService {
  constructor(
    @InjectQueue(STOCK_NOTIFICATION_QUEUE) private readonly queue: Queue,
  ) {}

  /**
   * Enqueues a low-stock notification job **only** when stock hits 3
   */
  async checkAndDispatchLowStock(
    variantId: string,
    oldStock: number,
    newStock: number,
    productName: string,
    imageUrl: string | null,
  ): Promise<void> {
    if (oldStock > 3 && newStock <= 3) {
      const payload: LowStockNotificationJob = {
        variantId,
        productName,
        imageUrl,
        oldStock,
        newStock,
      };

      await this.queue.add(NOTIFY_LOW_STOCK_JOB, payload);
    }
  }
}
