import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Attribute } from './attribute.model.js';

@ObjectType()
export class AttributeCategory {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => [Attribute], { nullable: true })
  attributes?: Attribute[];
}
