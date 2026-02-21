import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../../../common/prisma/prisma.service.js';
import { EmailService } from '../../../common/email/email.service.js';
import { STOCK_NOTIFICATION_QUEUE } from '../constants/queue.constants.js';
import type { LowStockNotificationJob } from '../types/stock-notification-job.type.js';

@Processor(STOCK_NOTIFICATION_QUEUE)
export class StockNotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(StockNotificationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {
    super();
  }

  async process(job: Job<LowStockNotificationJob>): Promise<void> {
    const { variantId, productName, imageUrl } = job.data;

    /**
     * Find every user who:
     *   a) liked this specific variant, AND
     *   b) has NOT yet purchased it (no non-cancelled order that contains it).
     *
     * The `orders: { none: { ... } }` filter is the key to (b):
     *   - It returns a user only when ZERO of their orders satisfy ALL inner
     *     conditions simultaneously.
     *   - Inner condition 1: `currentStatus: { not: 'cancelled' }` — the order
     *     is a real, active purchase (pending / paid / processing / shipped /
     *     delivered).
     *   - Inner condition 2: `items: { some: { variantId } }` — the order
     *     actually contains this variant.
     *
     * Together: "exclude users who have at least one active order that
     * contains this variant."  A cancelled order does NOT satisfy condition 1,
     * so it will not cause a user to be excluded — users who only ever had a
     * cancelled order for this variant still receive the notification.
     */
    const [users, variant] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          likes: {
            some: { productVariantId: variantId },
          },
          orders: {
            none: {
              currentStatus: { not: 'cancelled' },
              items: { some: { variantId } },
            },
          },
        },
        select: { email: true, username: true },
      }),
      this.prisma.productVariant.findUniqueOrThrow({
        where: { id: variantId },
        select: { priceCents: true, stripePaymentLinkUrl: true },
      }),
    ]);

    for (const user of users) {
      await this.emailService.sendLowStockEmail(
        user.email,
        user.username,
        productName,
        variant.priceCents,
        variant.stripePaymentLinkUrl,
        imageUrl,
      );
    }

    this.logger.log(
      `[${STOCK_NOTIFICATION_QUEUE}] Notified ${users.length} user(s) ` +
        `about low stock for variant "${variantId}".`,
    );
  }
}
