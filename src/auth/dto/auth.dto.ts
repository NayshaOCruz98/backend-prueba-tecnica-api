import {
  IsEmail, IsString, MinLength,
  MaxLength, IsNotEmpty, Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'Naysha', description: 'Nombre del usuario' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Cruz', description: 'Apellido del usuario' })
  @IsString()
  @IsNotEmpty({ message: 'El apellido es requerido' })
  @MaxLength(100)
  lastName: string;

  @ApiProperty({ example: 'naysha@example.com', description: 'Email único del usuario' })
  @IsEmail({}, { message: 'El email debe tener un formato válido' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'Password123',
    description: 'Mínimo 8 caracteres, una mayúscula, una minúscula y un número',
  })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(50)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'La contraseña debe tener al menos una mayúscula, una minúscula y un número',
  })
  password: string;
}

export class LoginDto {
  @ApiProperty({ example: 'naysha@example.com' })
  @IsEmail({}, { message: 'El email debe tener un formato válido' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Password123' })
  @IsString()
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  password: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'naysha@example.com' })
  @IsEmail({}, { message: 'El email debe tener un formato válido' })
  @IsNotEmpty()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Token recibido en el email de recuperación' })
  @IsString()
  @IsNotEmpty({ message: 'El token es requerido' })
  token: string;

  @ApiProperty({
    example: 'NewPassword456',
    description: 'Nueva contraseña — mínimo 8 caracteres, una mayúscula, una minúscula y un número',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(50)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'La contraseña debe tener al menos una mayúscula, una minúscula y un número',
  })
  newPassword: string;
}