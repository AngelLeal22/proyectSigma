// Eslabones de la cadena de responsabilidad del formulario de contacto.
// Cada uno hace una sola cosa y decide: corta la cadena respondiendo, o la
// pasa al siguiente con next(). El orden se arma en routes/contacto.js.
const express = require('express');
const { rateLimit } = require('express-rate-limit');
const { guardarSolicitud } = require('../lib/almacen');
const { enviarCorreoContacto } = require('../lib/correo');

const VENTANA_LIMITE_MS = 15 * 60 * 1000;
const MAX_ENVIOS_POR_VENTANA = 5;
const MAX_CUERPO = '10kb';

// Largo máximo por campo (mismos valores que los maxlength de public/index.html)
const MAX_LARGO = {
  nombre: 100,
  telefono: 30,
  email: 254,
  descripcion: 2000,
};

// Campo oculto que un humano nunca ve ni llena; los bots de spam sí.
const CAMPO_TRAMPA = 'sitio_web';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 1. Límite de envíos por IP. Va primero para no gastar ni en leer el cuerpo
// de quien ya superó su cupo.
const limitarEnvios = rateLimit({
  windowMs: VENTANA_LIMITE_MS,
  limit: MAX_ENVIOS_POR_VENTANA,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    ok: false,
    error: 'Recibimos varias solicitudes desde tu conexión. Espera unos minutos e intenta de nuevo, o escríbenos por WhatsApp.',
  },
});

// 2. Parsear el JSON con un tope de tamaño.
const leerCuerpo = express.json({ limit: MAX_CUERPO });

// 3. Honeypot: si el campo trampa viene lleno es un bot. Se le responde "ok"
// para que no sepa que fue detectado, pero no se guarda ni se envía nada.
function descartarBots(req, res, next) {
  const body = req.body || {};
  if (String(body[CAMPO_TRAMPA] || '').trim()) {
    return res.json({ ok: true });
  }
  next();
}

// 4. Validación: normaliza los campos y deja la solicitud lista en res.locals.
function validarContacto(req, res, next) {
  const body = req.body || {};
  const nombre = String(body.nombre || '').trim();
  const telefono = String(body.telefono || '').trim();
  const email = String(body.email || '').trim();
  const descripcion = String(body.descripcion || '').trim();

  const errores = {};
  if (!nombre) errores.nombre = 'Ingresa tu nombre y apellido.';
  else if (nombre.length > MAX_LARGO.nombre) errores.nombre = `Máximo ${MAX_LARGO.nombre} caracteres.`;
  if (!telefono || telefono.replace(/\D/g, '').length < 7) errores.telefono = 'Ingresa un número celular válido.';
  else if (telefono.length > MAX_LARGO.telefono) errores.telefono = `Máximo ${MAX_LARGO.telefono} caracteres.`;
  if (!email || email.length > MAX_LARGO.email || !EMAIL_RE.test(email)) errores.email = 'Ingresa un correo electrónico válido.';
  if (!descripcion) errores.descripcion = 'Cuéntanos brevemente qué necesitas.';
  else if (descripcion.length > MAX_LARGO.descripcion) errores.descripcion = `Máximo ${MAX_LARGO.descripcion} caracteres.`;

  if (Object.keys(errores).length > 0) {
    return res.status(400).json({ ok: false, errores });
  }

  res.locals.solicitud = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    nombre,
    telefono,
    email,
    descripcion,
    fecha: new Date().toISOString(),
  };
  next();
}

// 5. Guardar en data/contactos.json. Si falla, se corta la cadena con un 500:
// sin el dato guardado no tiene sentido avisar por correo.
function guardar(req, res, next) {
  try {
    guardarSolicitud(res.locals.solicitud);
  } catch (err) {
    console.error('Error guardando solicitud de contacto:', err);
    return res.status(500).json({ ok: false, error: 'No se pudo guardar la solicitud. Intenta de nuevo.' });
  }
  next();
}

// 6. Avisar por correo. La solicitud ya quedó guardada; si falla el correo no
// lo tratamos como error para el usuario (el dato no se pierde).
async function notificar(req, res, next) {
  try {
    await enviarCorreoContacto(res.locals.solicitud);
  } catch (err) {
    console.error('Error enviando el correo de contacto:', err);
  }
  next();
}

// 7. Fin de la cadena.
function responderOk(req, res) {
  res.json({ ok: true });
}

// Manejador de errores de la cadena (cuerpo demasiado grande o JSON inválido).
// Responde en JSON para que el frontend pueda mostrar el mensaje.
function manejarErrores(err, req, res, next) {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ ok: false, error: 'El mensaje es demasiado largo. Resume los detalles e intenta de nuevo.' });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ ok: false, error: 'Solicitud inválida.' });
  }
  console.error('Error inesperado en /api/contacto:', err);
  res.status(500).json({ ok: false, error: 'Ocurrió un error al enviar tu solicitud. Intenta de nuevo.' });
}

module.exports = {
  limitarEnvios,
  leerCuerpo,
  descartarBots,
  validarContacto,
  guardar,
  notificar,
  responderOk,
  manejarErrores,
  MAX_LARGO,
  CAMPO_TRAMPA,
};
