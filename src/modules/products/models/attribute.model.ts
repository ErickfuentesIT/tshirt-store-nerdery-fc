import { ObjectType, Field, ID } from '@nestjs/graphql';
import { AttributeCategory } from './attribute-category.model.js';

@ObjectType()
export class Attribute {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  attributeCategoryId: string;

  @Field(() => String)
  code: string;

  @Field(() => String)
  displayName: string;

  @Field(() => AttributeCategory, { nullable: true })
  attributeCategory?: AttributeCategory;
}
