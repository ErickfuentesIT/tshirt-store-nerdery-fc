import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Attribute } from './attribute.model.js';

@ObjectType()
export class AttributeCategory {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  attributeId: string;

  @Field(() => String)
  value: string;

  @Field(() => Attribute, { nullable: true })
  attribute?: Attribute;
}
