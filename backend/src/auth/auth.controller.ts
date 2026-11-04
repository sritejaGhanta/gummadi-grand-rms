import { Controller, Post, Body, UnauthorizedException, BadRequestException, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly logService: ActivityLogsService,
  ) {}

  @Post('login')
  @ApiOperation({ summary: 'Login with username and password' })
  async login(@Body() body: { username: string; password: string }) {
    if (!body?.username || !body?.password) {
      throw new BadRequestException('Username and password are required');
    }
    const user = await this.authService.validateUser(body.username, body.password);
    if (!user) {
      throw new UnauthorizedException('Invalid username or password');
    }

    const result = await this.authService.login(user);

    await this.logService.log({
      userId: user.id,
      username: user.username,
      roleName: user.role?.name,
      action: 'LOGIN',
      resource: 'auth',
      details: { username: user.username },
    });

    return result;
  }

  @Post('logout')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Logout current user' })
  async logout(@CurrentUser() user: any) {
    await this.logService.log({
      userId: user.id,
      username: user.username,
      roleName: user.role?.name,
      action: 'LOGOUT',
      resource: 'auth',
    });
    return this.authService.logout(user.id);
  }

  @Get('profile')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current logged-in user profile with permissions' })
  async getProfile(@CurrentUser() user: any) {
    return user;
  }
}
