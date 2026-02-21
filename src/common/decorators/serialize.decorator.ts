import { SetMetadata } from '@nestjs/common';

export const SERIALIZE_KEY = 'serialize_dto';

export function Serialize(dto: new (...args: any[]) => any) {
  return SetMetadata(SERIALIZE_KEY, dto);
}
