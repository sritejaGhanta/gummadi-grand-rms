import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { TenantRestaurant } from '../database/entities/tenant-restaurant.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @InjectRepository(TenantRestaurant)
    private readonly tenantRepo: Repository<TenantRestaurant>,
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
      restaurantId: user.restaurantId || null,
    };

    await this.usersService.updateLastLogin(user.id);

    const permissions =
      user.role?.rolePermissions?.map((rp) => rp.permission?.key).filter(Boolean) || [];

    let restaurant: any = null;
    if (user.restaurantId) {
      const tenant = await this.tenantRepo.findOne({ where: { id: user.restaurantId } });
      if (tenant) {
        restaurant = {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          brandLogo: tenant.brandLogo,
          cuisine: tenant.cuisine,
          city: tenant.city,
        };
      }
    }

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        restaurantId: user.restaurantId || null,
        restaurant,
        permissions,
      },
    };
  }

  async logout(userId: string) {
    await this.usersService.updateLastLogout(userId);
    return { success: true, message: 'Logged out successfully' };
  }
}
