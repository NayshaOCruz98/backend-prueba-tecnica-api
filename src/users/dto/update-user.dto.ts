import {
  IsString,
  IsOptional,
  MaxLength,
  IsEnum,
} from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class UpdateUserDto {
  @IsOptional()
  @IsString({ message: 'El nombre debe ser texto' })
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString({ message: 'El apellido debe ser texto' })
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @IsEnum(UserRole, { message: 'Rol inválido. Debe ser admin o user' })
  role?: UserRole;
}
