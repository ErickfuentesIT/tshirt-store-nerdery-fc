import { ObjectType, Field, ID } from '@nestjs/graphql';
import { AttributeCategory } from './attribute-category.model.js';

@ObjectType()
export class Attribute {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => [AttributeCategory], { nullable: true })
  attributeCategories?: AttributeCategory[];
}
