import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards,
  Request, HttpCode, HttpStatus, ParseUUIDPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags, ApiOperation, ApiResponse,
  ApiBearerAuth, ApiParam, ApiQuery,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductQueryDto,
} from './dto/product.dto';

@ApiTags('Products')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard('jwt'))
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // POST /api/v1/products
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear un nuevo producto' })
  @ApiResponse({ status: 201, description: 'Producto creado exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  create(@Body() dto: CreateProductDto, @Request() req: any) {
    // El dueño se asigna automáticamente desde el JWT
    return this.productsService.create(dto, req.user);
  }

  // GET /api/v1/products
  @Get()
  @ApiOperation({ summary: 'Listar productos con paginación y filtros' })
  @ApiQuery({ name: 'page',     required: false, example: 1 })
  @ApiQuery({ name: 'limit',    required: false, example: 10 })
  @ApiQuery({ name: 'category', required: false, example: 'Electrónica' })
  @ApiQuery({ name: 'search',   required: false, example: 'laptop' })
  @ApiResponse({ status: 200, description: 'Lista paginada de productos' })
  findAll(@Query() query: ProductQueryDto, @Request() req: any) {
    return this.productsService.findAll(query, req.user);
  }

  // GET /api/v1/products/:id
  @Get(':id')
  @ApiOperation({ summary: 'Obtener un producto por ID' })
  @ApiParam({ name: 'id', description: 'UUID del producto' })
  @ApiResponse({ status: 200, description: 'Producto encontrado' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.productsService.findOne(id, req.user);
  }

  // PATCH /api/v1/products/:id
  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un producto (admin)' })
  @ApiParam({ name: 'id', description: 'UUID del producto' })
  @ApiResponse({ status: 200, description: 'Producto actualizado' })
  @ApiResponse({ status: 403, description: 'No tienes permiso' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
    @Request() req: any,
  ) {
    return this.productsService.update(id, dto, req.user);
  }

  // DELETE /api/v1/products/:id
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar un producto — soft delete (dueño o admin)' })
  @ApiParam({ name: 'id', description: 'UUID del producto' })
  @ApiResponse({ status: 204, description: 'Producto eliminado correctamente' })
  @ApiResponse({ status: 403, description: 'No tienes permiso' })
  remove(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.productsService.remove(id, req.user);
  }
}