import { InputType, Field, ID } from '@nestjs/graphql';
import { IsUUID, ArrayMinSize } from 'class-validator';

@InputType()
export class AssignDeliveryInput {
  @Field(() => ID, { description: 'UUID of the delivery person to assign.' })
  @IsUUID()
  assignedDeliveryId: string;

  @Field(() => [ID], { description: 'UUIDs of the paid orders to assign and mark as processing.' })
  @IsUUID('4', { each: true })
  @ArrayMinSize(1)
  orderIds: string[];
}
