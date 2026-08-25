require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, 'data');
const CONTACTOS_FILE = path.join(DATA_DIR, 'contactos.json');
const CONTACT_TO_EMAIL = process.env.CONTACT_TO_EMAIL || 'Mercadeodigital@sigmapublicidad.com';
const LOGO_PATH = path.join(__dirname, 'public', 'imagenes', 'logo-sigma-email.png');

// El envío de correo solo se activa si hay credenciales SMTP configuradas en .env
// (ver .env.example). Si no están, la solicitud se sigue guardando normalmente
// en data/contactos.json, solo que sin el correo de aviso.
let mailer = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  mailer = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
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

app.use(express.json());

// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Ruta para servir la página principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Recibe el formulario de contacto, guarda cada solicitud en data/contactos.json
// y avisa por correo a CONTACT_TO_EMAIL
app.post('/api/contacto', async (req, res) => {
  const body = req.body || {};
  const nombre = String(body.nombre || '').trim();
  const telefono = String(body.telefono || '').trim();
  const email = String(body.email || '').trim();
  const descripcion = String(body.descripcion || '').trim();

  const errores = {};
  if (!nombre) errores.nombre = 'Ingresa tu nombre y apellido.';
  if (!telefono || telefono.replace(/\D/g, '').length < 7) errores.telefono = 'Ingresa un número celular válido.';
  if (!email || !EMAIL_RE.test(email)) errores.email = 'Ingresa un correo electrónico válido.';
  if (!descripcion) errores.descripcion = 'Cuéntanos brevemente qué necesitas.';

  if (Object.keys(errores).length > 0) {
    return res.status(400).json({ ok: false, errores });
  }

  const solicitud = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    nombre,
    telefono,
    email,
    descripcion,
    fecha: new Date().toISOString(),
  };

  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    let solicitudes = [];
    if (fs.existsSync(CONTACTOS_FILE)) {
      const raw = fs.readFileSync(CONTACTOS_FILE, 'utf8');
      solicitudes = raw ? JSON.parse(raw) : [];
    }
    solicitudes.push(solicitud);
    fs.writeFileSync(CONTACTOS_FILE, JSON.stringify(solicitudes, null, 2));
  } catch (err) {
    console.error('Error guardando solicitud de contacto:', err);
    return res.status(500).json({ ok: false, error: 'No se pudo guardar la solicitud. Intenta de nuevo.' });
  }

  // La solicitud ya quedó guardada; si falla el correo no lo tratamos como error
  // para el usuario (el dato no se pierde, queda en data/contactos.json).
  try {
    await enviarCorreoContacto(solicitud);
  } catch (err) {
    console.error('Error enviando el correo de contacto:', err);
  }

  res.json({ ok: true });
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});