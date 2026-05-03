import { Body, Controller, Inject, Post, UseGuards, Get, HttpCode } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  loginRequestSchema,
  refreshRequestSchema,
  registerRequestSchema
} from '@frollz2/schema';
import { CurrentUser } from './current-user.decorator.js';
import { Public } from './public.decorator.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { AuthService } from './auth.service.js';
import { ZodSchemaPipe } from '../../common/pipes/zod-schema.pipe.js';
import type { AuthenticatedUser } from './auth.types.js';

const isDevelopment = process.env['NODE_ENV'] === 'development';
const devThrottleEnabled = process.env['API_DEV_THROTTLE_ENABLED'] === 'true';
const configuredDevLimit = Number.parseInt(process.env['API_DEV_THROTTLE_LIMIT'] ?? '1000', 10);
const resolvedDevLimit = Number.isFinite(configuredDevLimit) && configuredDevLimit > 0 ? configuredDevLimit : 1000;

@Throttle({ default: { ttl: 60_000, limit: isDevelopment && devThrottleEnabled ? resolvedDevLimit : 5 } })
@ApiTags('auth')
@Controller('auth')
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) { }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'Token pair issued' })
  async register(@Body(new ZodSchemaPipe(registerRequestSchema)) body: typeof registerRequestSchema['_output']) {
    return this.authService.register(body);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Authenticate an existing user' })
  @ApiResponse({ status: 200, description: 'Token pair issued' })
  async login(@Body(new ZodSchemaPipe(loginRequestSchema)) body: typeof loginRequestSchema['_output']) {
    return this.authService.login(body);
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Rotate a refresh token' })
  @ApiResponse({ status: 200, description: 'Token pair issued' })
  async refresh(@Body(new ZodSchemaPipe(refreshRequestSchema)) body: typeof refreshRequestSchema['_output']) {
    return this.authService.refresh(body.refreshToken);
  }

  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Invalidate the current refresh token' })
  @ApiResponse({ status: 200, description: 'Refresh token removed' })
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodSchemaPipe(refreshRequestSchema)) body: typeof refreshRequestSchema['_output']
  ) {
    await this.authService.logout(user.userId, body.refreshToken);

    return null;
  }

  @Get('me')
  @ApiOperation({ summary: 'Get the current user' })
  @ApiResponse({ status: 200, description: 'Current user payload' })
  async me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.me(user.userId);
  }
}
