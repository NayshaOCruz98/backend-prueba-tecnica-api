import {
  Controller, Post, Body,
  UseGuards, HttpCode, HttpStatus, Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags, ApiOperation, ApiResponse, ApiBody,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // POST /api/v1/auth/register
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar nuevo usuario' })
  @ApiResponse({ status: 201, description: 'Usuario creado — retorna JWT' })
  @ApiResponse({ status: 409, description: 'El email ya está registrado' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // POST /api/v1/auth/login
  // LocalGuard valida email/password antes de llegar al método
  @Post('login')
  @UseGuards(AuthGuard('local'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Login exitoso — retorna JWT' })
  @ApiResponse({ status: 401, description: 'Credenciales incorrectas' })
  login(@Request() req: any) {
    // req.user es seteado por LocalStrategy tras validar
    return this.authService.login(req.user);
  }
}