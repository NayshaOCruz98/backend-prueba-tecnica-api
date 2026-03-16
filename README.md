# backend-prueba-tecnica-api

## Requisitos

- Node.js >= 18
- npm >= 9
- PostgreSQL >= 14 **o** Docker

---

## Instalación
```bash
git clone https://github.com/NayshaOCruz98/backend-prueba-tecnica-api.git
cd backend-prueba-tecnica-api
npm install
```

Copia el archivo de variables de entorno y edítalo con tus credenciales:
```bash
cp .env.example .env
```

## Base de datos — el proyecto se puede probar de dos formas

### Opción A — Docker (recomendado)

No requiere tener PostgreSQL instalado.
```bash
docker-compose up -d
```

Esto levanta:
- **PostgreSQL** en el puerto `5432` — base de datos `user_products_db`
- **MailHog** en el puerto `1025` (SMTP) y `8025` (UI de emails)

> ⚠️ Si ya tienes PostgreSQL corriendo localmente en el puerto `5432`,
> cambia el puerto en `docker-compose.yml`:
> ```yaml
> ports:
>   - '5433:5432'
> ```
> Y en `.env` actualiza:
> ```dotenv
> DB_PORT=5433
> ```

### Opción B — PostgreSQL local (sin Docker)
```bash
psql -U postgres -c "CREATE DATABASE user_products_db;"
```

Edita el `.env` con tus credenciales:
```dotenv
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=tu_password_local
DB_NAME=user_products_db
```

---

## Iniciar el servidor
```bash
npm run start:dev
```

| Servicio | URL |
|---|---|
| API | http://localhost:3000/api/v1 |
| Swagger | http://localhost:3000/docs |

---

## Cómo probar el proyecto

### Opción A — Swagger (sin levantar frontend)

Disponible en http://localhost:3000/docs una vez levantado el servidor.
No requiere instalar nada adicional.

1. Registrar usuario con `POST /auth/register`
2. Copiar el `accessToken` de la respuesta
3. Click en **Authorize** (candado arriba a la derecha)
4. Pegar el token en el campo **Value** — solo el token, sin la palabra "Bearer"
5. Click en **Authorize** → **Close**
6. Probar todos los endpoints desde el navegador

> ℹ️ El token expira en 24h. Si los endpoints retornan 401,
> vuelve a hacer login y actualiza el token en Authorize.

### Opción B — Frontend

Repositorio: https://github.com/NayshaOCruz98/frontend-prueba-tecnica

Levantar el frontend y abrir http://localhost:5173.
Ver instrucciones en el README del repositorio.

---

## Recuperación de contraseña — elige una opción

### Opción A — MailHog con Docker (recomendado)

Si levantaste con `docker-compose up -d`, MailHog ya está corriendo.
El `.env.example` ya tiene esta configuración lista:
```dotenv
MAIL_HOST=localhost
MAIL_PORT=1025
MAIL_USER=
MAIL_PASS=
```

Ver emails recibidos en: **http://localhost:8025**

El link del email apunta a `http://localhost:5173/reset-password?token=...`


### Opción B — Sin configurar email

Llamar primero `POST /auth/forgot-password` con el email del usuario,
luego obtener el token directamente de la base de datos:

**Con Docker:**
```bash
docker exec -it user_products_db psql -U postgres -d user_products_db \
-c "SELECT token, expires_at FROM password_reset_tokens ORDER BY created_at DESC LIMIT 1;"
```

**Con PostgreSQL local:**
```bash
psql -U postgres -d user_products_db \
-c "SELECT token, expires_at FROM password_reset_tokens ORDER BY created_at DESC LIMIT 1;"
```

- **Con frontend levantado** — navega manualmente a:
```
  http://localhost:5173/reset-password?token=PEGA_EL_TOKEN_AQUI
```
- **Sin frontend** — usa el token directamente en `POST /api/v1/auth/reset-password` desde Swagger.

## Crear usuario admin

Por defecto todos los usuarios se registran con `role: user`.
Para probar los endpoints que requieren rol admin:

**Con Docker:**
```bash
docker exec -it user_products_db psql -U postgres -d user_products_db \
-c "UPDATE users SET role = 'admin' WHERE email = 'tu@email.com';"
```

**Con PostgreSQL local:**
```bash
psql -U postgres -d user_products_db \
-c "UPDATE users SET role = 'admin' WHERE email = 'tu@email.com';"
```

> ⚠️ Después de cambiar el rol debes volver a hacer login para obtener
> un nuevo JWT con `role: admin`.

---

## Tests
```bash
npm run test        # correr todos los tests
npm run test:cov    # ver cobertura de código
```

---

## Lo que permite el sistema

- Registro con contraseña segura (mínimo 8 caracteres, mayúscula + minúscula + número)
- Login con JWT — expira en 24h
- Recuperar contraseña por email — token de un solo uso, expira en 1h
- CRUD de productos con paginación, búsqueda y filtros por categoría
- Admin ve y gestiona todos los productos y usuarios
- Usuario normal solo ve y gestiona lo suyo

## Lo que no permite

- Reutilizar la misma contraseña al hacer reset
- Usar un token de recuperación más de una vez
- Usar un token expirado (más de 1 hora)
- Un usuario normal ver datos de otros usuarios
- Autopromovarse a rol admin