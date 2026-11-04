import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'super_secret_restaurant_jwt_key_2026_xyz',
    });
  }

  async validate(payload: { sub: string; username: string }) {
    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User account is inactive or not found');
    }

    const permissions =
      user.role?.rolePermissions?.map((rp) => rp.permission?.key).filter(Boolean) || [];

    return {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      permissions,
      isActive: user.isActive,
    };
  }
}
