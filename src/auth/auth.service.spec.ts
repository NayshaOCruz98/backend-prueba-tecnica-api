import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { MailService } from './mail.service';
import { UsersService } from '../users/users.service';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { User, UserRole } from '../users/entities/user.entity';

// ── Mock del usuario base ─────────────────────────────────────────────────
const mockUser: User = {
  id: 'uuid-123',
  firstName: 'Juan',
  lastName: 'Pérez',
  email: 'juan@example.com',
  password: '$2b$12$hashedPassword',
  role: UserRole.USER,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  products: [],
  passwordResetTokens: [],
};

// ── Mocks de dependencias ─────────────────────────────────────────────────
const mockUsersService = {
  findByEmail: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  updatePassword: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock.jwt.token'),
};

const mockConfigService = {
  get: jest.fn().mockReturnValue('test-secret'),
};

const mockMailService = {
  sendPasswordReset: jest.fn().mockResolvedValue(undefined),
};

const mockResetTokenRepo = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
};

// ─────────────────────────────────────────────────────────────────────────
describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService,                            useValue: mockUsersService },
        { provide: JwtService,                              useValue: mockJwtService },
        { provide: ConfigService,                           useValue: mockConfigService },
        { provide: MailService,                             useValue: mockMailService },
        { provide: getRepositoryToken(PasswordResetToken),  useValue: mockResetTokenRepo },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    // Limpiar mocks entre tests
    jest.clearAllMocks();
  });

  // ── register ─────────────────────────────────────────────────────────────
  describe('register()', () => {
    const dto = {
      firstName: 'Juan',
      lastName: 'Pérez',
      email: 'juan@example.com',
      password: 'Password123',
    };

    it('debe registrar un usuario nuevo y retornar accessToken', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null); // email no existe
      mockUsersService.create.mockResolvedValue(mockUser);

      const result = await service.register(dto);

      expect(result.accessToken).toBe('mock.jwt.token');
      expect(result.user).toEqual(mockUser);
      expect(mockUsersService.create).toHaveBeenCalledTimes(1);
    });

    it('debe lanzar ConflictException si el email ya existe', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser); // email ya existe

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
      expect(mockUsersService.create).not.toHaveBeenCalled();
    });

    it('debe hashear la contraseña antes de guardar', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue(mockUser);

      await service.register(dto);

      // Verificar que create fue llamado con una contraseña hasheada (no plana)
      const createCall = mockUsersService.create.mock.calls[0][0];
      expect(createCall.password).not.toBe(dto.password);
      expect(createCall.password).toMatch(/^\$2b\$/); // formato bcrypt
    });
  });

  // ── validateUser ──────────────────────────────────────────────────────────
  describe('validateUser()', () => {
    it('debe retornar el usuario si las credenciales son correctas', async () => {
      const hashedPassword = await bcrypt.hash('Password123', 10);
      mockUsersService.findByEmail.mockResolvedValue({
        ...mockUser,
        password: hashedPassword,
      });

      const result = await service.validateUser('juan@example.com', 'Password123');

      expect(result).toBeDefined();
      expect(result?.email).toBe('juan@example.com');
    });

    it('debe retornar null si el email no existe', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      const result = await service.validateUser('noexiste@example.com', 'Password123');

      expect(result).toBeNull();
    });

    it('debe retornar null si la contraseña es incorrecta', async () => {
      const hashedPassword = await bcrypt.hash('OtraPassword123', 10);
      mockUsersService.findByEmail.mockResolvedValue({
        ...mockUser,
        password: hashedPassword,
      });

      const result = await service.validateUser('juan@example.com', 'Password123');

      expect(result).toBeNull();
    });

    it('debe retornar null si el usuario está inactivo', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      const result = await service.validateUser('juan@example.com', 'Password123');

      expect(result).toBeNull();
    });
  });

  // ── login ─────────────────────────────────────────────────────────────────
  describe('login()', () => {
    it('debe retornar el usuario y un accessToken', () => {
      const result = service.login(mockUser);

      expect(result.accessToken).toBe('mock.jwt.token');
      expect(result.user).toEqual(mockUser);
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
    });
  });

  // ── forgotPassword ────────────────────────────────────────────────────────
  describe('forgotPassword()', () => {
    it('debe generar un token y enviar el email si el usuario existe', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      mockResetTokenRepo.update.mockResolvedValue(undefined);
      mockResetTokenRepo.create.mockReturnValue({ token: 'uuid-token' });
      mockResetTokenRepo.save.mockResolvedValue(undefined);

      await service.forgotPassword({ email: 'juan@example.com' });

      expect(mockResetTokenRepo.save).toHaveBeenCalledTimes(1);
      expect(mockMailService.sendPasswordReset).toHaveBeenCalledTimes(1);
      expect(mockMailService.sendPasswordReset).toHaveBeenCalledWith(
        mockUser,
        expect.any(String), // el token UUID generado
      );
    });

    it('debe retornar sin error si el email no existe (seguridad)', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      // No debe lanzar ninguna excepción
      await expect(
        service.forgotPassword({ email: 'noexiste@example.com' }),
      ).resolves.not.toThrow();

      // No debe intentar crear tokens ni enviar emails
      expect(mockResetTokenRepo.save).not.toHaveBeenCalled();
      expect(mockMailService.sendPasswordReset).not.toHaveBeenCalled();
    });
  });

  // ── resetPassword ─────────────────────────────────────────────────────────
  describe('resetPassword()', () => {
    const validToken = {
      id: 'token-uuid',
      token: 'valid-token',
      userId: 'uuid-123',
      isUsed: false,
      expiresAt: new Date(Date.now() + 3600000), // expira en 1 hora
    };

    it('debe actualizar la contraseña con un token válido', async () => {
      mockResetTokenRepo.findOne.mockResolvedValue(validToken);
      mockUsersService.updatePassword.mockResolvedValue(undefined);
      mockResetTokenRepo.save.mockResolvedValue(undefined);

      await service.resetPassword({
        token: 'valid-token',
        newPassword: 'NewPassword456',
      });

      expect(mockUsersService.updatePassword).toHaveBeenCalledTimes(1);
      expect(mockResetTokenRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ isUsed: true }), // token marcado como usado
      );
    });

    it('debe lanzar BadRequestException si el token no existe', async () => {
      mockResetTokenRepo.findOne.mockResolvedValue(null);

      await expect(
        service.resetPassword({ token: 'invalid', newPassword: 'NewPassword456' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe lanzar BadRequestException si el token está expirado', async () => {
      mockResetTokenRepo.findOne.mockResolvedValue({
        ...validToken,
        expiresAt: new Date(Date.now() - 3600000), // expiró hace 1 hora
      });

      await expect(
        service.resetPassword({ token: 'expired-token', newPassword: 'NewPassword456' }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});