import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { Product } from './entities/product.entity';
import { User, UserRole } from '../users/entities/user.entity';

const mockUser: User = {
  id: 'uuid-user-1',
  firstName: 'Juan',
  lastName: 'Pérez',
  email: 'juan@example.com',
  password: '$2b$12$hashed',
  role: UserRole.USER,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
} as User;

const mockAdmin: User = {
  ...mockUser,
  id: 'uuid-admin-1',
  role: UserRole.ADMIN,
} as User;

const mockProduct: Product = {
  id: 'uuid-product-1',
  name: 'Laptop Dell XPS',
  description: 'Laptop de alto rendimiento',
  price: 1299.99,
  stock: 10,
  category: 'Electrónica',
  isActive: true,
  userId: 'uuid-user-1',
  user: mockUser,
  createdAt: new Date(),
  updatedAt: new Date(),
} as Product;

const mockProductRepo = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  findAndCount: jest.fn(),
};

describe('ProductsService', () => {
  let service: ProductsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: getRepositoryToken(Product), useValue: mockProductRepo },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    jest.clearAllMocks();
  });

  describe('create()', () => {
    it('debe crear un producto asignando el userId del usuario autenticado', async () => {
      const dto = { name: 'Laptop', price: 999.99, stock: 5 };
      mockProductRepo.create.mockReturnValue({ ...dto, userId: mockUser.id });
      mockProductRepo.save.mockResolvedValue(mockProduct);

      const result = await service.create(dto as any, mockUser);

      expect(mockProductRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: mockUser.id }),
      );
      expect(result).toEqual(mockProduct);
    });
  });

  describe('findAll()', () => {
    it('usuario normal solo ve sus propios productos', async () => {
      mockProductRepo.findAndCount.mockResolvedValue([[mockProduct], 1]);

      const result = await service.findAll({ page: 1, limit: 10 }, mockUser);

      expect(mockProductRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: mockUser.id }),
        }),
      );
      expect(result.total).toBe(1);
    });

    it('admin ve todos los productos sin filtro de userId', async () => {
      mockProductRepo.findAndCount.mockResolvedValue([[mockProduct], 1]);

      await service.findAll({ page: 1, limit: 10 }, mockAdmin);

      const callArgs = mockProductRepo.findAndCount.mock.calls[0][0];
      expect(callArgs.where).not.toHaveProperty('userId');
    });

    it('debe calcular la paginación correctamente', async () => {
      mockProductRepo.findAndCount.mockResolvedValue([[], 25]);

      const result = await service.findAll({ page: 2, limit: 10 }, mockAdmin);

      expect(result.page).toBe(2);
      expect(result.total).toBe(25);
      expect(result.totalPages).toBe(3);
      expect(mockProductRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });
  });

  describe('findOne()', () => {
    it('debe retornar el producto si el usuario es el dueño', async () => {
      mockProductRepo.findOne.mockResolvedValue(mockProduct);

      const result = await service.findOne('uuid-product-1', mockUser);

      expect(result).toEqual(mockProduct);
    });

    it('debe retornar el producto si el usuario es admin', async () => {
      const productDeOtro = { ...mockProduct, userId: 'otro-user-id' };
      mockProductRepo.findOne.mockResolvedValue(productDeOtro);

      const result = await service.findOne('uuid-product-1', mockAdmin);

      expect(result).toEqual(productDeOtro);
    });

    it('debe lanzar ForbiddenException si un user accede a producto ajeno', async () => {
      const productDeOtro = { ...mockProduct, userId: 'otro-user-id' };
      mockProductRepo.findOne.mockResolvedValue(productDeOtro);

      await expect(
        service.findOne('uuid-product-1', mockUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe lanzar NotFoundException si el producto no existe', async () => {
      mockProductRepo.findOne.mockResolvedValue(null);

      await expect(
        service.findOne('no-existe', mockUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove()', () => {
    it('debe hacer soft delete marcando isActive false', async () => {
      mockProductRepo.findOne.mockResolvedValue(mockProduct);
      mockProductRepo.save.mockResolvedValue({ ...mockProduct, isActive: false });

      await service.remove('uuid-product-1', mockUser);

      expect(mockProductRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
      );
    });

    it('debe lanzar ForbiddenException si un user elimina producto ajeno', async () => {
      const productDeOtro = { ...mockProduct, userId: 'otro-user-id' };
      mockProductRepo.findOne.mockResolvedValue(productDeOtro);

      await expect(
        service.remove('uuid-product-1', mockUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});