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

async function enviarCorreoContacto(solicitud) {
  if (!mailer) return;
  await mailer.sendMail({
    from: `"Sitio Sigma" <${process.env.SMTP_USER}>`,
    to: CONTACT_TO_EMAIL,
    replyTo: solicitud.email,
    subject: `Nueva solicitud de contacto — ${solicitud.nombre}`,
    text: [
      `Nombre y apellido: ${solicitud.nombre}`,
      `Número celular: ${solicitud.telefono}`,
      `Email: ${solicitud.email}`,
      '',
      'Descripción:',
      solicitud.descripcion,
      '',
      `Recibido: ${solicitud.fecha}`,
    ].join('\n'),
    html: `
      <p><strong>Nombre y apellido:</strong> ${solicitud.nombre}</p>
      <p><strong>Número celular:</strong> ${solicitud.telefono}</p>
      <p><strong>Email:</strong> ${solicitud.email}</p>
      <p><strong>Descripción:</strong><br>${solicitud.descripcion.replace(/\n/g, '<br>')}</p>
      <p style="color:#64748b;font-size:0.85rem;">Recibido: ${solicitud.fecha}</p>
    `,
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