import Resend from "@auth/core/providers/resend";
import { Resend as ResendAPI } from "resend";
import { type RandomReader, generateRandomString } from "@oslojs/crypto/random";

export const ResendOTPPasswordReset = Resend({
  id: "resend-otp-password-reset",
  apiKey: process.env.AUTH_RESEND_KEY,
  async generateVerificationToken() {
    const random: RandomReader = {
      read(bytes) {
        crypto.getRandomValues(bytes);
      },
    };

    const alphabet = "0123456789";
    const length = 8;
    return generateRandomString(random, alphabet, length);
  },
  async sendVerificationRequest({ identifier: email, provider, token }) {
    const resend = new ResendAPI(provider.apiKey);
    const { error } = await resend.emails.send({
      from: "Fudi <onboarding@resend.dev>",
      to: [email],
      subject: `Restablece tu contraseña en Fudi`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #fa7316;">Restablece tu contraseña</h2>
          <p>Hemos recibido una solicitud para restablecer tu contraseña.</p>
          <p>Tu código de verificación es:</p>
          <div style="background-color: #f3f4f6; border: 2px solid #fa7316; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #fa7316; font-size: 32px; letter-spacing: 4px; margin: 0;">${token}</h1>
          </div>
          <p style="color: #6b7280; font-size: 14px;">Este código expirará en 10 minutos.</p>
          <p style="color: #6b7280; font-size: 14px;">Si no solicitaste este cambio, puedes ignorar este correo.</p>
        </div>
      `,
      text: `Tu código de restablecimiento de contraseña es: ${token}`,
    });

    if (error) {
      throw new Error("No se pudo enviar el correo de restablecimiento");
    }
  },
});
