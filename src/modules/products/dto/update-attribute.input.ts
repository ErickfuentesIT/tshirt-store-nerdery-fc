import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

@InputType()
export class UpdateAttributeInput {
  @Field(() => String, { nullable: true, description: 'Human-readable label shown in the UI. Does not affect SKUs.' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  displayName?: string;
}
