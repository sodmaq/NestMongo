import { Body, Controller, Post, UseFilters, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtGuard } from './guards';
import { LoginDto, RefreshTokenDto, SignupDto } from './dto';
import { AllExceptionsFilter } from 'src/filters/all-exceptions.filter';

@Controller('auth')
@UseFilters(new AllExceptionsFilter())
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Post('signup')
  async signUp(@Body() dto: SignupDto) {
    return this.authService.signUp(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.handleRefreshToken(dto);
  }
}
