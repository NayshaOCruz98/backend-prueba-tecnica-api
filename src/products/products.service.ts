import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
import { Product } from './entities/product.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { CreateProductDto, UpdateProductDto, ProductQueryDto } from './dto/product.dto';

export interface PaginatedProducts {
  data: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  /**
   * Crea un nuevo producto asociado al usuario autenticado.
   */
  async create(dto: CreateProductDto, user: User): Promise<Product> {
    const product = this.productRepo.create({
      ...dto,
      userId: user.id,
    });
    return this.productRepo.save(product);
  }

  /**
   * Lista productos con paginación y filtros opcionales.
   * - Admins ven todos los productos activos.
   * - Usuarios normales solo ven sus propios productos.
   */
  async findAll(query: ProductQueryDto, user: User): Promise<PaginatedProducts> {
    const { page = 1, limit = 10, category, search } = query;
    const skip = (page - 1) * limit;

    // Construir condición según el rol
    const where: FindOptionsWhere<Product> = { isActive: true };

    if (user.role !== UserRole.ADMIN) {
      where.userId = user.id;
    }

    if (category) {
      where.category = category;
    }

    if (search) {
      // Búsqueda por nombre (con LIKE)
      const [data, total] = await this.productRepo.findAndCount({
        where: [
          { ...where, name: Like(`%${search}%`) },
          { ...where, description: Like(`%${search}%`) },
        ],
        skip,
        take: limit,
        order: { createdAt: 'DESC' },
      });

      return {
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }

    const [data, total] = await this.productRepo.findAndCount({
      where,
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Retorna un producto por ID.
   * Verifica que el usuario tenga acceso al producto.
   */
  async findOne(id: string, user: User): Promise<Product> {
    const product = await this.productRepo.findOne({
      where: { id, isActive: true },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    // Un usuario normal solo puede ver sus propios productos
    if (user.role !== UserRole.ADMIN && product.userId !== user.id) {
      throw new ForbiddenException('No tienes acceso a este producto');
    }

    return product;
  }

  /**
   * Actualiza un producto.
   * Solo el dueño o un admin puede actualizarlo.
   */
  async update(id: string, dto: UpdateProductDto, user: User): Promise<Product> {
    const product = await this.findOne(id, user);

    if (user.role !== UserRole.ADMIN && product.userId !== user.id) {
      throw new ForbiddenException('No tienes permiso para editar este producto');
    }

    Object.assign(product, dto);
    return this.productRepo.save(product);
  }

  /**
   * Elimina un producto (soft delete — marca isActive = false).
   * Solo el dueño o un admin puede eliminarlo.
   */
  async remove(id: string, user: User): Promise<void> {
    const product = await this.findOne(id, user);

    if (user.role !== UserRole.ADMIN && product.userId !== user.id) {
      throw new ForbiddenException('No tienes permiso para eliminar este producto');
    }

    product.isActive = false;
    await this.productRepo.save(product);
  }
}
