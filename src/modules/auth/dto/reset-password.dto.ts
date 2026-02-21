import { IsNotEmpty, IsString, IsStrongPassword, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', description: 'Password reset token received via email' })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  token: string;

  @ApiProperty({ example: 'NewStr0ng!Pass', description: 'Must have at least 8 chars, 1 uppercase, 1 lowercase, 1 number, and 1 symbol' })
  @IsStrongPassword(
    {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    },
    {
      message:
        'Password is not strong enough. It must have at least 8 characters, one uppercase letter, one lowercase letter, one number, and one symbol.',
    },
  )
  newPassword: string;
}
