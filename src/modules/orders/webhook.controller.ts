import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import Stripe from 'stripe';
import { StripeService } from './../../common/stripe/stripe.service.js';
import { OrdersService } from './services/orders.service.js';

@Controller('webhooks')
export class WebhookController {
  constructor(
    private readonly stripeService: StripeService,
    private readonly ordersService: OrdersService,
  ) {}
  // STRIPE webhook receiver and validator
  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  async handleStripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    let event: Stripe.Event;

    if (!req['rawBody']) {
      throw new BadRequestException('Missing request body');
    }

    try {
      event = this.stripeService.verifyWebhookEvent(req['rawBody'], signature);
    } catch (error) {
      throw new BadRequestException(
        `Webhook Signature Error: ${error.message}`,
      );
    }

    await this.ordersService.handleStripeEvent(event);

    return { received: true };
  }
}
