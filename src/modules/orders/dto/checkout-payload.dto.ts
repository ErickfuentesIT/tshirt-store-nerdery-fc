import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class CheckoutPayload {
  @Field(() => String, {
    description:
      'The Stripe client_secret. Pass this to Stripe.js on the frontend ' +
      'to render the Payment Element and confirm the payment.',
  })
  clientSecret: string;

  @Field(() => ID, {
    description: 'The ID of the newly created pending order in our database.',
  })
  orderId: string;
}
