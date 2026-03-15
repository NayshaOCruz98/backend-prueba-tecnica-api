import {
  Injectable,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/auth.dto';
import { User } from '../users/entities/user.entity';
import { JwtPayload } from './strategies/jwt.strategy';

const SALT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // ── Register ────────────────────────────────────────────────────────────
  async register(dto: RegisterDto): Promise<{ user: User; accessToken: string }> {
    const exists = await this.usersService.findByEmail(dto.email);
    if (exists) {
      throw new ConflictException('El email ya está registrado');
    }

    const hashedPassword = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const user = await this.usersService.create({
      ...dto,
      password: hashedPassword,
    });

    return {
      user,
      accessToken: this.generateJwt(user),
    };
  }

  // ── Validate User (usado por LocalStrategy) ──────────────────────────────
  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.isActive) return null;

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return null;

    return user;
  }

  // ── Login ────────────────────────────────────────────────────────────────
  login(user: User): { user: User; accessToken: string } {
    return {
      user,
      accessToken: this.generateJwt(user),
    };
  }

  // ── Helpers privados ─────────────────────────────────────────────────────
  private generateJwt(user: User): string {
    const payload: JwtPayload = {
      sub:   user.id,
      email: user.email,
      role:  user.role,
    };
    return this.jwtService.sign(payload);
  }
}