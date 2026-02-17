import { ObjectType, Field, ID } from '@nestjs/graphql';
import { AttributeCategory } from './attribute-category.model.js';

@ObjectType()
export class VariantAttributeCategory {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  variantId: string;

  @Field(() => String)
  attributeCategoryId: string;

  @Field(() => AttributeCategory, { nullable: true })
  attributeCategory?: AttributeCategory;
}
