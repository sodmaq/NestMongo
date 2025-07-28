import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
export class SignupDto extends LoginDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  verificationSentAt: Date;
}

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class VerifyEmailDto {
  @IsString()
  @IsNotEmpty()
  token: string;
}

export class resendVerificationEmailDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
