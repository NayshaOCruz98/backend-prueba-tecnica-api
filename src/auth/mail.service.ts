import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { User } from '../users/entities/user.entity';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('MAIL_HOST') as string,
      port: this.configService.get<number>('MAIL_PORT') as number,
      secure: false,
      ignoreTLS: true,
    } as nodemailer.TransportOptions);
  }

  /**
   * Envía el email de recuperación de contraseña con el link de reset.
   */
  async sendPasswordReset(user: User, token: string): Promise<void> {
    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3001',
    );
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    const mailOptions: nodemailer.SendMailOptions = {
      from: `"User-Prueba tecnica" <${this.configService.get('MAIL_FROM')}>`,
      to: user.email,
      subject: 'Recuperación de contraseña',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Hola, ${user.firstName}!</h2>
          <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
          <p>Haz clic en el siguiente botón para crear una nueva contraseña:</p>
          <a
            href="${resetLink}"
            style="
              display: inline-block;
              padding: 12px 24px;
              background-color: #4F46E5;
              color: white;
              text-decoration: none;
              border-radius: 6px;
              margin: 16px 0;
            "
          >
            Restablecer contraseña
          </a>
          <p>O copia y pega este enlace en tu navegador:</p>
          <p style="color: #6B7280; word-break: break-all;">${resetLink}</p>
          <p><strong>Este enlace expira en 1 hora.</strong></p>
          <hr />
          <p style="color: #9CA3AF; font-size: 12px;">
            Si no solicitaste esto, puedes ignorar este correo.
            Tu contraseña no cambiará hasta que hagas clic en el enlace.
          </p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email de recuperación enviado a: ${user.email}`);
    } catch (error) {
      this.logger.error(`Error al enviar email a ${user.email}:`, error);
    }
  }
}
