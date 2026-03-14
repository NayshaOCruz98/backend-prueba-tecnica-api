import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /**
   * Crea un nuevo usuario en la base de datos.
   */
  async create(data: Partial<User>): Promise<User> {
    const user = this.userRepo.create(data);
    return this.userRepo.save(user);
  }

  /**
   * Retorna todos los usuarios activos (solo para admins).
   */
  async findAll(): Promise<User[]> {
    return this.userRepo.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Busca un usuario por su ID.
   */
  async findById(id: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  /**
   * Busca un usuario por su email.
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { email } });
  }

  /**
   * Actualiza los datos de un usuario.
   * Un usuario solo puede editar su propio perfil (a menos que sea admin).
   */
  async update(
    id: string,
    dto: UpdateUserDto,
    requestingUser: User,
  ): Promise<User> {
    const user = await this.findById(id);

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Solo el propio usuario o un admin puede actualizar
    if (requestingUser.id !== id && requestingUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('No tienes permiso para editar este usuario');
    }

    // Solo un admin puede cambiar el rol
    if (dto.role && requestingUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Solo un administrador puede cambiar roles');
    }

    Object.assign(user, dto);
    return this.userRepo.save(user);
  }

  /**
   * Desactiva un usuario (soft delete).
   * Solo admins pueden desactivar usuarios.
   */
  async remove(id: string, requestingUser: User): Promise<void> {
    const user = await this.findById(id);

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (requestingUser.role !== UserRole.ADMIN && requestingUser.id !== id) {
      throw new ForbiddenException('No tienes permiso para eliminar este usuario');
    }

    user.isActive = false;
    await this.userRepo.save(user);
  }

  /**
   * Actualiza la contraseña de un usuario (usado en reset de contraseña).
   */
  async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    await this.userRepo.update(userId, { password: hashedPassword });
  }
}
