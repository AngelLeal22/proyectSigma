const path = require('path');
const nodemailer = require('nodemailer');

const CONTACT_TO_EMAIL = process.env.CONTACT_TO_EMAIL || 'Mercadeodigital@sigmapublicidad.com';
const LOGO_PATH = path.join(__dirname, '..', 'public', 'imagenes', 'logo-sigma-email.png');

// Tope global de avisos por hora, sin importar la IP de origen. Protege la
// cuenta SMTP de una suspensión por envío masivo si alguien rota IPs para
// saltarse el límite por IP. Las solicitudes por encima del tope se siguen
// guardando en data/contactos.json, solo que sin correo.
const MAX_CORREOS_POR_HORA = Number(process.env.MAX_CORREOS_POR_HORA) || 50;
const UNA_HORA_MS = 60 * 60 * 1000;
let ventanaInicio = Date.now();
let correosEnVentana = 0;

function reservarCupoCorreo() {
  const ahora = Date.now();
  if (ahora - ventanaInicio >= UNA_HORA_MS) {
    ventanaInicio = ahora;
    correosEnVentana = 0;
  }
  if (correosEnVentana >= MAX_CORREOS_POR_HORA) return false;
  correosEnVentana++;
  return true;
}

// El envío de correo solo se activa si hay credenciales SMTP configuradas en .env
// (ver .env.example). Si no están, la solicitud se sigue guardando normalmente
// en data/contactos.json, solo que sin el correo de aviso.
let mailer = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  const secure = process.env.SMTP_SECURE === 'true';
  mailer = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure,
    // En el puerto 587 exige STARTTLS: si el servidor no lo ofrece (o alguien
    // en la red lo quita), se aborta en vez de mandar la contraseña sin cifrar.
    requireTLS: !secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
} else {
  console.warn('SMTP no configurado (falta .env): las solicitudes de contacto no se enviarán por correo, solo se guardarán en data/contactos.json.');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatearFecha(iso) {
  return new Date(iso).toLocaleString('es-VE', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'America/Caracas',
  });
}

// Fila de la tabla de datos del correo (label pequeño en mayúsculas + valor)
function filaCorreo(label, valorHtml, { ultima } = {}) {
  const borde = ultima ? '' : 'border-bottom:1px solid #e2e8f0;';
  return `
    <tr>
      <td style="padding:14px 0;${borde}">
        <p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#64748b;">${label}</p>
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#0f172a;">${valorHtml}</p>
      </td>
    </tr>`;
}

function construirCorreoHtml(solicitud) {
  const nombre = escapeHtml(solicitud.nombre);
  const telefono = escapeHtml(solicitud.telefono);
  const email = escapeHtml(solicitud.email);
  const descripcion = escapeHtml(solicitud.descripcion).replace(/\n/g, '<br>');
  const fecha = formatearFecha(solicitud.fecha);
  const primerNombre = nombre.split(' ')[0];

  return `<!DOCTYPE html>
<html lang="es">
  <body style="margin:0;padding:0;background-color:#f1f5f9;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,0.12);">
            <!-- Encabezado -->
            <tr>
              <td style="background-color:#212a8f;padding:26px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="width:34px;"><img src="cid:sigma-logo" width="34" height="34" alt="Sigma" style="display:block;width:34px;height:34px;"></td>
                    <td style="padding-left:12px;font-family:Arial,Helvetica,sans-serif;font-size:19px;font-weight:700;letter-spacing:0.08em;color:#ffffff;">SIGMA</td>
                  </tr>
                </table>
              </td>
            </tr>
            <!-- Línea de acento (teal → naranja) -->
            <tr>
              <td style="height:4px;line-height:4px;font-size:0;background-color:#1fb8c4;background-image:linear-gradient(90deg,#1fb8c4,#f0721c);">&nbsp;</td>
            </tr>
            <!-- Cuerpo -->
            <tr>
              <td style="padding:36px 32px 8px;">
                <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#f0721c;">Nueva solicitud de contacto</p>
                <h1 style="margin:0 0 28px;font-family:Arial,Helvetica,sans-serif;font-size:22px;line-height:1.3;color:#0f172a;">${nombre} quiere hacer un pedido</h1>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e2e8f0;">
                  ${filaCorreo('Nombre y apellido', nombre)}
                  ${filaCorreo('Número celular', `<a href="tel:${telefono.replace(/\s/g, '')}" style="color:#0f172a;text-decoration:none;">${telefono}</a>`)}
                  ${filaCorreo('Email', `<a href="mailto:${email}" style="color:#0f172a;text-decoration:none;">${email}</a>`)}
                  ${filaCorreo('Detalles del pedido', descripcion, { ultima: true })}
                </table>

                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 32px;">
                  <tr>
                    <td style="border-radius:8px;background-color:#f59e0b;">
                      <a href="mailto:${email}" style="display:inline-block;padding:13px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">Responder a ${primerNombre}</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <!-- Pie -->
            <tr>
              <td style="padding:18px 32px;background-color:#f8fafc;border-top:1px solid #e2e8f0;">
                <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#94a3b8;">Recibido el ${fecha} &middot; Formulario de contacto de sigmapublicidad.com</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

async function enviarCorreoContacto(solicitud) {
  if (!mailer) return;
  if (!reservarCupoCorreo()) {
    console.warn(`Tope de ${MAX_CORREOS_POR_HORA} correos/hora alcanzado: la solicitud ${solicitud.id} quedó guardada pero sin aviso por correo.`);
    return;
  }
  const info = await mailer.sendMail({
    from: `"Sigma — Formulario Web" <${process.env.SMTP_USER}>`,
    to: CONTACT_TO_EMAIL,
    replyTo: solicitud.email,
    subject: `Nueva solicitud de contacto — ${solicitud.nombre}`,
    text: [
      `Nueva solicitud de contacto — Sigma`,
      '',
      `Nombre y apellido: ${solicitud.nombre}`,
      `Número celular: ${solicitud.telefono}`,
      `Email: ${solicitud.email}`,
      '',
      'Detalles del pedido:',
      solicitud.descripcion,
      '',
      `Recibido: ${formatearFecha(solicitud.fecha)}`,
    ].join('\n'),
    html: construirCorreoHtml(solicitud),
    attachments: [
      {
        filename: 'logo-sigma.png',
        path: LOGO_PATH,
        cid: 'sigma-logo',
      },
    ],
  });
  console.log('Correo de contacto enviado:', {
    to: CONTACT_TO_EMAIL,
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected,
    response: info.response,
  });
}

module.exports = { enviarCorreoContacto, construirCorreoHtml };
