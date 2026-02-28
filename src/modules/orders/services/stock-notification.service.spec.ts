import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';

import { StockNotificationService } from './stock-notification.service.js';
import {
  STOCK_NOTIFICATION_QUEUE,
  NOTIFY_LOW_STOCK_JOB,
} from '../constants/queue.constants.js';

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('StockNotificationService', () => {
  let service: StockNotificationService;
  let queueAddMock: jest.Mock;

  beforeEach(async () => {
    queueAddMock = jest.fn().mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockNotificationService,
        {
          provide: getQueueToken(STOCK_NOTIFICATION_QUEUE),
          useValue: { add: queueAddMock },
        },
      ],
    }).compile();

    service = module.get<StockNotificationService>(StockNotificationService);
  });

  // ── checkAndDispatchLowStock ──────────────────────────────────────────────

  describe('checkAndDispatchLowStock', () => {
    const BASE = {
      variantId: 'variant-1',
      productName: 'Cool T-Shirt',
      imageUrl: 'https://img.url/shirt.jpg',
    };

    it('should enqueue a job when stock crosses the low-stock threshold', async () => {
      await service.checkAndDispatchLowStock(
        BASE.variantId, 5, 2, BASE.productName, BASE.imageUrl,
      );

      expect(queueAddMock).toHaveBeenCalledWith(NOTIFY_LOW_STOCK_JOB, {
        variantId: BASE.variantId,
        productName: BASE.productName,
        imageUrl: BASE.imageUrl,
        oldStock: 5,
        newStock: 2,
      });
    });

    it('should enqueue when newStock is exactly 3', async () => {
      await service.checkAndDispatchLowStock(
        BASE.variantId, 10, 3, BASE.productName, BASE.imageUrl,
      );

      expect(queueAddMock).toHaveBeenCalledWith(NOTIFY_LOW_STOCK_JOB, {
        variantId: BASE.variantId,
        productName: BASE.productName,
        imageUrl: BASE.imageUrl,
        oldStock: 10,
        newStock: 3,
      });
    });

    it('should enqueue with null imageUrl', async () => {
      await service.checkAndDispatchLowStock(
        BASE.variantId, 5, 1, BASE.productName, null,
      );

      expect(queueAddMock).toHaveBeenCalledWith(
        NOTIFY_LOW_STOCK_JOB,
        expect.objectContaining({ imageUrl: null }),
      );
    });

    it('should NOT enqueue when oldStock is already at or below the threshold', async () => {
      await service.checkAndDispatchLowStock(
        BASE.variantId, 3, 1, BASE.productName, BASE.imageUrl,
      );

      expect(queueAddMock).not.toHaveBeenCalled();
    });

    it('should NOT enqueue when newStock remains above the threshold', async () => {
      await service.checkAndDispatchLowStock(
        BASE.variantId, 10, 4, BASE.productName, BASE.imageUrl,
      );

      expect(queueAddMock).not.toHaveBeenCalled();
    });

    it('should NOT enqueue when both oldStock and newStock are above the threshold', async () => {
      await service.checkAndDispatchLowStock(
        BASE.variantId, 10, 5, BASE.productName, BASE.imageUrl,
      );

      expect(queueAddMock).not.toHaveBeenCalled();
    });
  });
});
