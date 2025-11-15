import { Controller, Post, Body, UseGuards, Request, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';

class LoginDto {
  email: string;
  password: string;
}

class RegisterDto {
  email: string;
  password: string;
  name: string;
  role?: string;
}

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @UseGuards(LocalAuthGuard)
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Request() req) {
    if (!req.user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.login(req.user);
  }

  @Post('register')
  @ApiOperation({ summary: 'Register new user' })
  @ApiResponse({ status: 201, description: 'User registered' })
  async register(@Body() registerDto: RegisterDto) {
    const user = await this.authService.register(
      registerDto.email,
      registerDto.password,
      registerDto.name,
      registerDto.role,
    );
    
    return {
      message: 'User registered successfully',
      user,
    };
  }

  @Post('seed')
  @ApiOperation({ summary: 'Seed test accounts (development only)' })
  @ApiResponse({ status: 201, description: 'Test accounts created' })
  async seed() {
    // Only allow in development or with a secret key
    if (process.env.NODE_ENV === 'production' && process.env.SEED_SECRET !== 'allow-seed-in-production') {
      throw new UnauthorizedException('Seeding not allowed in production');
    }
    
    return this.authService.seedTestAccounts();
  }
}