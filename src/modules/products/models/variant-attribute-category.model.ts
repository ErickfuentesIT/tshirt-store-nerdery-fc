import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Attribute } from './attribute.model.js';

@ObjectType()
export class VariantAttributeCategory {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  variantId: string;

  @Field(() => String)
  attributeId: string;

  @Field(() => Attribute, { nullable: true })
  attribute?: Attribute;
}
