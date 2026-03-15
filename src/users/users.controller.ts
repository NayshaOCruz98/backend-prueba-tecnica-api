import {
  Controller, Get, Patch, Delete,
  Param, Body, UseGuards, Request,
  ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth, ApiTags, ApiOperation,
  ApiResponse, ApiParam,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { UserRole } from './entities/user.entity';
import { Roles } from 'src/common/decorators/roles.decorator';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard('jwt'))
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar usuario (admin)' })
  @ApiParam({ name: 'id', description: 'UUID del usuario' })
  @ApiResponse({ status: 200, description: 'Usuario actualizado' })
    @ApiResponse({ status: 403, description: 'Solo un administrador puede cambiar roles' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @Request() req: any,
  ) {
    return this.usersService.update(id, dto, req.user);
  }

  @Get()
  @UseGuards(RolesGuard)          
  @Roles(UserRole.ADMIN)          
  @ApiOperation({ summary: 'Listar todos los usuarios (solo admin)' })
  @ApiResponse({ status: 200, description: 'Lista de usuarios activos' })
  @ApiResponse({ status: 403, description: 'Acceso denegado — se requiere rol admin' })
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar usuario por ID' })
  @ApiParam({ name: 'id', description: 'UUID del usuario' })
  @ApiResponse({ status: 200, description: 'Usuario encontrado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findById(id);
  }


  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar usuario (admin)' })
  @ApiParam({ name: 'id', description: 'UUID del usuario' })
  @ApiResponse({ status: 204, description: 'Usuario desactivado correctamente' })
  remove(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.usersService.remove(id, req.user);
  }
}