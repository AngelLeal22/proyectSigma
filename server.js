const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, 'data');
const CONTACTOS_FILE = path.join(DATA_DIR, 'contactos.json');

app.use(express.json());

// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Ruta para servir la página principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Recibe el formulario de contacto y guarda cada solicitud en data/contactos.json
app.post('/api/contacto', (req, res) => {
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

  res.json({ ok: true });
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});