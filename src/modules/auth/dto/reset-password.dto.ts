import { IsNotEmpty, IsString, IsStrongPassword, IsUUID } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  token: string;

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
