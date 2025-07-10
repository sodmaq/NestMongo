import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class Si {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
