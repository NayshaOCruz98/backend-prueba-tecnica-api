import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { User, UserRole } from './entities/user.entity';

// ── Usuarios de prueba ────────────────────────────────────────────────────
const mockUser: User = {
  id: 'uuid-user-1',
  firstName: 'Naysha',
  lastName: 'ortiz',
  email: 'Nicholl@example.com',
  password: '$2b$12$hashed',
  role: UserRole.USER,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  products: [],
  passwordResetTokens: [],
};

const mockAdmin: User = {
  ...mockUser,
  id: 'uuid-admin-1',
  email: 'admin@example.com',
  role: UserRole.ADMIN,
};

const mockUserRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
};

// ─────────────────────────────────────────────────────────────────────────
describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  // ── findAll ───────────────────────────────────────────────────────────────
  describe('findAll()', () => {
    it('debe retornar solo usuarios activos', async () => {
      mockUserRepo.find.mockResolvedValue([mockUser]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(mockUserRepo.find).toHaveBeenCalledWith({
        where: { isActive: true },
        order: { createdAt: 'DESC' },
      });
    });
  });

  // ── findById ──────────────────────────────────────────────────────────────
  describe('findById()', () => {
    it('debe retornar el usuario si existe', async () => {
      mockUserRepo.findOne.mockResolvedValue(mockUser);

      const result = await service.findById('uuid-user-1');

      expect(result).toEqual(mockUser);
    });

    it('debe retornar null si no existe', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      const result = await service.findById('no-existe');

      expect(result).toBeNull();
    });
  });

  // ── update ────────────────────────────────────────────────────────────────
  describe('update()', () => {
    it('debe permitir al dueño actualizar su propio perfil', async () => {
      mockUserRepo.findOne.mockResolvedValue(mockUser);
      mockUserRepo.save.mockResolvedValue({
        ...mockUser,
        firstName: 'Carlos',
      });

      const result = await service.update(
        'uuid-user-1',
        { firstName: 'Carlos' },
        mockUser, // el mismo usuario es quien hace la request
      );

      expect(result.firstName).toBe('Carlos');
    });

    it('debe permitir al admin actualizar cualquier perfil', async () => {
      mockUserRepo.findOne.mockResolvedValue(mockUser);
      mockUserRepo.save.mockResolvedValue({
        ...mockUser,
        firstName: 'Carlos',
      });

      const result = await service.update(
        'uuid-user-1',
        { firstName: 'Carlos' },
        mockAdmin, // admin actualiza otro usuario
      );

      expect(result.firstName).toBe('Carlos');
    });

    it('debe lanzar ForbiddenException si un user intenta editar a otro', async () => {
      const otroUser = { ...mockUser, id: 'uuid-user-2' };
      mockUserRepo.findOne.mockResolvedValue(otroUser);

      await expect(
        service.update('uuid-user-2', { firstName: 'Hacker' }, mockUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe lanzar ForbiddenException si un user intenta cambiar su rol', async () => {
      mockUserRepo.findOne.mockResolvedValue(mockUser);

      await expect(
        service.update(
          'uuid-user-1',
          { role: UserRole.ADMIN }, // intentar autopromovarse
          mockUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe lanzar NotFoundException si el usuario no existe', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update('no-existe', { firstName: 'Juan' }, mockAdmin),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── remove ────────────────────────────────────────────────────────────────
  describe('remove()', () => {
    it('debe desactivar el usuario (soft delete)', async () => {
      mockUserRepo.findOne.mockResolvedValue(mockUser);
      mockUserRepo.save.mockResolvedValue({ ...mockUser, isActive: false });

      await service.remove('uuid-user-1', mockUser);

      expect(mockUserRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
      );
    });

    it('debe lanzar ForbiddenException si un user intenta eliminar a otro', async () => {
      const otroUser = { ...mockUser, id: 'uuid-user-2' };
      mockUserRepo.findOne.mockResolvedValue(otroUser);

      await expect(
        service.remove('uuid-user-2', mockUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe lanzar NotFoundException si el usuario no existe', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      await expect(
        service.remove('no-existe', mockAdmin),
      ).rejects.toThrow(NotFoundException);
    });
  });
});