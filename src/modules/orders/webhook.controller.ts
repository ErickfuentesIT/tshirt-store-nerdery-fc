import { BadRequestException, Controller, Headers, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import Stripe from 'stripe';
import { StripeService } from './../../common/stripe/stripe.service.js';
import { OrdersService } from './orders.service.js';


@Controller('stripe')
export class WebhookController {
    constructor(
    private readonly stripeService: StripeService,
    private readonly ordersService: OrdersService,
  ) {}

  // This creates the endpoint: POST http://localhost:3000/webhooks/stripe
  @Post('webhooks')
  @HttpCode(HttpStatus.OK) // Stripe requires a 200 OK response, not the default 201 Created
  async handleStripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    // 1. Did they even bring an ID?
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    let event: Stripe.Event;

    if (!req['rawBody']) {
      throw new BadRequestException('Missing request body');
    }

    try {
      // 2. The Bouncer verifies the cryptographic signature
      // (NestJS attaches the rawBuffer to req['rawBody'] because of our main.ts change)
      event = this.stripeService.verifyWebhookEvent(req['rawBody'], signature);
    } catch (error) {
      // 3. If the math fails, it's a hacker. Kick them out.
      throw new BadRequestException(`Webhook Signature Error: ${error.message}`);
    }

    // 4. The event is 100% verified. Hand it to the Cashier (OrdersService).
    await this.ordersService.handleStripeEvent(event);

    // 5. Tell Stripe "Message received!" so they don't keep calling back.
    return { received: true };
  }

}
