import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  NOTIFY_LOW_STOCK_JOB,
  STOCK_NOTIFICATION_QUEUE,
} from './constants/queue.constants.js';
import type { LowStockNotificationJob } from './interfaces/stock-notification-job.interface.js';

@Injectable()
export class StockNotificationService {
  constructor(
    @InjectQueue(STOCK_NOTIFICATION_QUEUE) private readonly queue: Queue,
  ) {}

  /**
   * Enqueues a low-stock notification job **only** when stock has just crossed
   * the threshold from above 3 down to 3 or below.
   *
   * Calling this after every stock decrement is safe: the oldStock > 3 guard
   * ensures the job is enqueued exactly once per threshold crossing rather than
   * on every subsequent decrement.
   */
  async checkAndDispatchLowStock(
    variantId:   string,
    oldStock:    number,
    newStock:    number,
    productName: string,
    imageUrl:    string | null,
  ): Promise<void> {
    if (oldStock > 3 && newStock <= 3) {
      const payload: LowStockNotificationJob = {
        variantId,
        productName,
        imageUrl,
        newStock,
      };

      await this.queue.add(NOTIFY_LOW_STOCK_JOB, payload);
    }
  }
}
