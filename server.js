require('dotenv').config();
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const contactoRouter = require('./routes/contacto');
const app = express();
const PORT = process.env.PORT || 3000;
const EN_PRODUCCION = process.env.NODE_ENV === 'production';

// Detrás de un proxy (Render, Railway, Nginx, Cloudflare...) la IP real del
// visitante llega en X-Forwarded-For. TRUST_PROXY indica cuántos proxies hay
// delante; sin esto el límite de envíos vería a todos con la misma IP.
if (process.env.TRUST_PROXY) {
  app.set('trust proxy', Number(process.env.TRUST_PROXY));
}

// Cabeceras de seguridad (CSP, anti-clickjacking, nosniff, etc.)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      'script-src': ["'self'"],
      'style-src': ["'self'", 'https://fonts.googleapis.com'],
      // index.html tiene algunos atributos style="..." en línea
      'style-src-attr': ["'unsafe-inline'"],
      'font-src': ["'self'", 'https://fonts.gstatic.com'],
      'frame-src': ['https://www.google.com'],
      // En local (http://localhost) no forzar https en los recursos
      'upgrade-insecure-requests': EN_PRODUCCION ? [] : null,
    },
  },
  // Sin includeSubDomains: el certificado SSL cubre solo el dominio y www, y
  // HSTS con subdominios obligaría a HTTPS también en mail. y otros.
  strictTransportSecurity: {
    maxAge: 31536000,
    includeSubDomains: false,
  },
}));

// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Ruta para servir la página principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Formulario de contacto (ver routes/contacto.js para la cadena de controles)
app.use('/api/contacto', contactoRouter);

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
