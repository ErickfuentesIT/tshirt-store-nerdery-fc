import { Expose } from 'class-transformer';

export class CreateUserResponseDto {
  @Expose()
  id: string;

  @Expose()
  username: string;
}
