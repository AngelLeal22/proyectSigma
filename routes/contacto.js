const express = require('express');
const {
  limitarEnvios,
  leerCuerpo,
  descartarBots,
  validarContacto,
  guardar,
  notificar,
  responderOk,
  manejarErrores,
} = require('../middleware/contacto');

const router = express.Router();

// Cadena de responsabilidad: cada eslabón puede cortar la solicitud o pasarla
// al siguiente. Para agregar o quitar un control, se agrega o quita aquí.
router.post(
  '/',
  limitarEnvios,
  leerCuerpo,
  descartarBots,
  validarContacto,
  guardar,
  notificar,
  responderOk,
);

router.use(manejarErrores);

module.exports = router;
