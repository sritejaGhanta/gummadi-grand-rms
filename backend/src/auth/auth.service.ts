import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usersService.findByUsername(username);
    if (!user) {
      return null;
    }

    if (!user.isActive) {
      throw new UnauthorizedException('This account has been deactivated by the administrator.');
    }

    const isMatch = await bcrypt.compare(pass, user.passwordHash);
    if (isMatch) {
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role?.name,
    };

    await this.usersService.updateLastLogin(user.id);

    const permissions =
      user.role?.rolePermissions?.map((rp) => rp.permission?.key).filter(Boolean) || [];

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        permissions,
      },
    };
  }

  async logout(userId: string) {
    await this.usersService.updateLastLogout(userId);
    return { success: true, message: 'Logged out successfully' };
  }
}
