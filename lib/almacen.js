const path = require('path');
const fs = require('fs');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const CONTACTOS_FILE = path.join(DATA_DIR, 'contactos.json');

// Lee las solicitudes existentes. Si el archivo está dañado (p. ej. el proceso
// se cayó a mitad de una escritura antigua) se aparta como respaldo y se
// empieza uno nuevo, en vez de fallar para siempre con cada solicitud.
function leerSolicitudes() {
  if (!fs.existsSync(CONTACTOS_FILE)) return [];
  const raw = fs.readFileSync(CONTACTOS_FILE, 'utf8');
  if (!raw) return [];
  try {
    const datos = JSON.parse(raw);
    if (Array.isArray(datos)) return datos;
    throw new Error('el contenido no es una lista');
  } catch (err) {
    const respaldo = `${CONTACTOS_FILE}.danado-${Date.now()}`;
    fs.renameSync(CONTACTOS_FILE, respaldo);
    console.error(`contactos.json estaba dañado (${err.message}); se movió a ${respaldo} y se empieza uno nuevo.`);
    return [];
  }
}

// Guarda una solicitud nueva. Se escribe primero a un archivo temporal y luego
// se renombra: el rename es atómico, así que contactos.json nunca queda a medias.
// Todo es síncrono a propósito: así dos solicitudes simultáneas no pueden
// intercalar su lectura y escritura y perder datos.
function guardarSolicitud(solicitud) {
  fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
  const solicitudes = leerSolicitudes();
  solicitudes.push(solicitud);
  const tmp = `${CONTACTOS_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(solicitudes, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, CONTACTOS_FILE);
}

module.exports = { guardarSolicitud, CONTACTOS_FILE };
