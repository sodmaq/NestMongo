import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtGuard } from './guards';
import {
  EmailDto,
  LoginDto,
  RefreshTokenDto,
  resendVerificationEmailDto,
  ResetPasswordDto,
  SignupDto,
  TokenDto,
  VerifyOtpDto,
} from './dto';
import { AllExceptionsFilter } from 'src/filters/all-exceptions.filter';

@Controller('auth')
@UseFilters(new AllExceptionsFilter())
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Post('signup')
  async signUp(@Body() dto: SignupDto) {
    return this.authService.signUp(dto);
  }

  @Get('verify/:token')
  async verifyEmail(@Param() dto: TokenDto) {
    return this.authService.verifyEmail(dto);
  }

  @Post('resend')
  async resendVerificationEmail(@Body() dto: resendVerificationEmailDto) {
    return this.authService.resendVerificationEmail(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.handleRefreshToken(dto);
  }

  @Post('forgot-password')
  forgotPassword(@Body() dto: EmailDto) {
    return this.authService.forgotPassword(dto);
  }
}
