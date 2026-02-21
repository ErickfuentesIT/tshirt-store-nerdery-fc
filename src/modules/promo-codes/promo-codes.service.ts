import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import type { CreatePromoCodeInput } from './dto/create-promo-code.input.js';
import type { CartItemForDiscount } from './types/cart-item.type.js';

export interface DiscountResult {
  isValid: true;
  totalDiscountCents: number;
}

@Injectable()
export class PromoCodesService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Manager Mutations ────────────────────────────────────────────────────

  async createPromoCode(input: CreatePromoCodeInput) {
    const { applications, campaignId, ...rest } = input;

    return this.prisma.promoCode.create({
      data: {
        ...rest,
        ...(campaignId ? { campaign: { connect: { id: campaignId } } } : {}),
        applications: {
          create: applications.map((app) => ({
            productId: app.productId,
            productVariantId: app.productVariantId ?? null,
          })),
        },
      },
      include: { applications: true },
    });
  }

  async togglePromoCode(id: string) {
    const promo = await this.prisma.promoCode.findUnique({
      where: { id },
      select: { id: true, isActive: true },
    });

    if (!promo) {
      throw new NotFoundException(`Promo code "${id}" not found.`);
    }

    return this.prisma.promoCode.update({
      where: { id },
      data: { isActive: !promo.isActive },
      include: { applications: true },
    });
  }

  async validateAndCalculateDiscount(
    code: string,
    cartItems: CartItemForDiscount[],
  ): Promise<DiscountResult> {
    const promo = await this.prisma.promoCode.findUnique({
      where: { code },
      include: { applications: true },
    });

    if (!promo || !promo.isActive) {
      throw new BadRequestException(`Promo code "${code}" is not valid.`);
    }

    if (promo.expirationDate < new Date()) {
      throw new BadRequestException(`Promo code "${code}" has expired.`);
    }

    if (promo.usageLimit !== null && promo.usedCount >= promo.usageLimit) {
      throw new BadRequestException(
        `Promo code "${code}" has reached its maximum number of uses.`,
      );
    }

    const cartTotalCents = cartItems.reduce(
      (sum, item) => sum + item.priceCents * item.quantity,
      0,
    );

    if (
      promo.minPurchaseAmountCents !== null &&
      cartTotalCents < promo.minPurchaseAmountCents
    ) {
      const required = (promo.minPurchaseAmountCents / 100).toFixed(2);
      throw new BadRequestException(
        `Promo code "${code}" requires a minimum purchase of $${required}.`,
      );
    }

    const { applications } = promo;
    const isStoreWide = applications.length === 0;

    const eligibleSubtotalCents = cartItems.reduce((sum, item) => {
      const eligible =
        isStoreWide ||
        applications.some(
          (app) =>
            app.productId === item.productId &&
            (app.productVariantId === null ||
              app.productVariantId === item.variantId),
        );

      return eligible ? sum + item.priceCents * item.quantity : sum;
    }, 0);

    if (eligibleSubtotalCents === 0) {
      throw new BadRequestException(
        `Promo code "${code}" does not apply to any items in your cart.`,
      );
    }

    // ── Discount calculation ──────────────────────────────────────────────────

    let rawDiscountCents: number;

    if (promo.discountType === 'PERCENTAGE') {

      rawDiscountCents = Math.floor(
        (eligibleSubtotalCents * promo.discountValue) / 100,
      );
    } else {
      rawDiscountCents = promo.discountValue;
    }

    const totalDiscountCents = Math.min(rawDiscountCents, eligibleSubtotalCents);

    return { isValid: true, totalDiscountCents };
  }
}
