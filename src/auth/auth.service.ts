import {
  Injectable,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { UsersService } from '../users/users.service';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { RegisterDto, ForgotPasswordDto, ResetPasswordDto } from './dto/auth.dto';
import { MailService } from './mail.service';
import { User } from '../users/entities/user.entity';
import { JwtPayload } from './strategies/jwt.strategy';

const SALT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    @InjectRepository(PasswordResetToken)
    private readonly resetTokenRepo: Repository<PasswordResetToken>,
  ) {}

  // ── Register ─────────────────────────────────────────────────────────────
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

    return { user, accessToken: this.generateJwt(user) };
  }

  // ── Validate User (usado por LocalStrategy) ───────────────────────────────
  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.isActive) return null;

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return null;

    return user;
  }

  // ── Login ─────────────────────────────────────────────────────────────────
  login(user: User): { user: User; accessToken: string } {
    return { user, accessToken: this.generateJwt(user) };
  }

  // ── Forgot Password ───────────────────────────────────────────────────────
  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.usersService.findByEmail(dto.email);

    // Aunque el email no exista no revelamos nada — seguridad
    if (!user) return;

    // Invalidar tokens anteriores del mismo usuario
    await this.resetTokenRepo.update(
      { userId: user.id, isUsed: false },
      { isUsed: true },
    );

    // Crear nuevo token con expiración de 1 hora
    const rawToken = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    const resetToken = this.resetTokenRepo.create({
      token: rawToken,
      userId: user.id,
      expiresAt,
    });

    await this.resetTokenRepo.save(resetToken);

    // Enviar email con MailHog
    await this.mailService.sendPasswordReset(user, rawToken);
  }

  // ── Reset Password ────────────────────────────────────────────────────────
  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    // Buscar el token en la BD
    const tokenRecord = await this.resetTokenRepo.findOne({
      where: { token: dto.token, isUsed: false },
    });

    if (!tokenRecord) {
      throw new BadRequestException('Token inválido o ya utilizado');
    }

    if (tokenRecord.expiresAt < new Date()) {
      throw new BadRequestException('El token ha expirado');
    }
    const user = await this.usersService.findById(tokenRecord.userId);
    if (!user) {
      throw new BadRequestException('Usuario no encontrado');
    }

    const isSamePassword = await bcrypt.compare(dto.newPassword, user.password);
    if (isSamePassword) {
      throw new BadRequestException(
        'La nueva contraseña no puede ser una que hayas usado antes',
      );
    }
    // Actualizar la contraseña
    const hashedPassword = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);
    await this.usersService.updatePassword(tokenRecord.userId, hashedPassword);

    // Marcar el token como usado — no se puede reutilizar
    tokenRecord.isUsed = true;
    await this.resetTokenRepo.save(tokenRecord);
  }

  // ── Helpers privados ──────────────────────────────────────────────────────
  private generateJwt(user: User): string {
    const payload: JwtPayload = {
      sub:   user.id,
      email: user.email,
      role:  user.role,
    };
    return this.jwtService.sign(payload);
  }
}