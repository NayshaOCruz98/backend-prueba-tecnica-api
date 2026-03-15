import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './users/entities/user.entity';
import { Product } from './products/entities/product.entity';
import { UsersModule } from './users/users.module'; 
import { PasswordResetToken } from './auth/entities/password-reset-token.entity';
import { AuthModule } from './auth/auth.module';
import { ProductsModule } from './products/products.module';
@Module({
  imports: [
    // Hace disponibles las variables de .env en toda la app
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Conexión a PostgreSQL con valores desde .env
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get<string>('DB_USERNAME', 'postgres'),
        password: config.get<string>('DB_PASSWORD', ''),
        database: config.get<string>('DB_NAME', 'user_products_db'),
        entities: [User, Product, PasswordResetToken],      
        synchronize: true,
        logging: config.get<string>('NODE_ENV') === 'development',
      }),
    }),
     UsersModule,  
     AuthModule,
     ProductsModule,
  ],
})
export class AppModule {}