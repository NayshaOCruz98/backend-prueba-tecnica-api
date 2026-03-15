import {
  IsString, IsNotEmpty, IsNumber,
  IsOptional, IsInt, Min, MaxLength, IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ example: 'Laptop Dell XPS 15', description: 'Nombre del producto' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ example: 'Laptop de alto rendimiento con i7 y 32GB RAM' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 1299.99, description: 'Precio del producto — debe ser mayor a 0' })
  @IsNumber()
  @IsPositive({ message: 'El precio debe ser mayor a 0' })
  @Type(() => Number)
  price: number;

  @ApiPropertyOptional({ example: 10, description: 'Stock disponible — no puede ser negativo' })
  @IsOptional()
  @IsInt()
  @Min(0, { message: 'El stock no puede ser negativo' })
  @Type(() => Number)
  stock?: number;

  @ApiPropertyOptional({ example: 'Electrónica' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;
}

export class UpdateProductDto {
  @ApiPropertyOptional({ example: 'Laptop Dell XPS 15 actualizada' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ example: 'Nueva descripción' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 999.99 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  price?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  stock?: number;

  @ApiPropertyOptional({ example: 'Computación' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;
}

export class ProductQueryDto {
  @ApiPropertyOptional({ example: 'Electrónica', description: 'Filtrar por categoría' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 'laptop', description: 'Buscar por nombre o descripción' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 1, description: 'Número de página — default 1' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, description: 'Resultados por página — default 10' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 10;
}