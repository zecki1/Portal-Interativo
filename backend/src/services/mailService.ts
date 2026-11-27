import nodemailer from "nodemailer";
import { MailConfigSchema } from "../schemas/directory.js";

/** Transporte de e-mail por SMTP (Nodemailer). Credenciais somente no .env. */
export function transporte() {
  const config = MailConfigSchema.parse({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.MAIL_FROM,
    fromName: process.env.MAIL_FROM_NAME,
    secure: process.env.SMTP_SECURE === "true",
  });
  return {
    config,
    transporter: nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.user, pass: config.pass },
      // Alguns provedores corporativos usam certificados internos.
      tls: { rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== "true" },
    }),
  };
}

export interface Mensagem {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function enviar(mensagem: Mensagem) {
  const { config, transporter } = transporte();
  return transporter.sendMail({
    from: `"${config.fromName}" <${config.from}>`,
    to: mensagem.to,
    subject: mensagem.subject,
    text: mensagem.text,
    html: mensagem.html,
  });
}

/** Convite para conta convidada (usado pelo fluxo de /directory/guests). */
export async function enviarConvite(email: string, nome: string, workgroup: string, senhaTemporaria: string) {
  return enviar({
    to: email,
    subject: "Convite para o Portal Interativo",
    text:
      `Olá ${nome},\n\nVocê foi convidado(a) para o workgroup "${workgroup}" no Portal Interativo.\n` +
      `Senha temporária: ${senhaTemporaria}\n\nAltere a senha no primeiro acesso.\n`,
    html: undefined,
  });
}
