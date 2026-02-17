import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsOptional, IsUUID, IsArray } from 'class-validator';

@InputType()
export class InsertAttributesWithCategoryInput {
  @Field(() => String, {
    nullable: true,
    description:
      'Existing attribute category ID (Case B). Omit to create a new one (Case A).',
  })
  @IsUUID()
  @IsOptional()
  attributeCategoryId?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Name for the new attribute category (required for Case A).',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @Field(() => [String], {
    description: 'List of attribute values to create as children.',
  })
  @IsArray()
  @IsString({ each: true })
  values: string[];
}
