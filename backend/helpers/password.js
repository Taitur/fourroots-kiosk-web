const crypto = require("crypto");

// Valida la contraseña introducida contra kio_tbUsuarios.vcClave (binary(50), rellenado con 0x00).
//
// TODO: implementar aquí el cifrado del sistema Eslabón original. Por ahora se compara
// el texto tal cual con el contenido de la columna (sin el relleno de ceros).
function verifyPassword(plainPassword, storedClave) {
  if (!storedClave || typeof plainPassword !== "string") return false;

  const stored = Buffer.from(storedClave);
  const end = stored.indexOf(0);
  const expected = end === -1 ? stored : stored.subarray(0, end);
  const received = Buffer.from(plainPassword, "latin1");

  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}

const CLAVE_LENGTH = 50;

// Construye el valor binary(50) que espera kio_tbUsuarios.vcClave a partir de la contraseña
// en texto plano (mismo relleno de ceros que lee verifyPassword).
function buildClave(plainPassword) {
  const bytes = Buffer.from(plainPassword, "latin1");
  if (bytes.length >= CLAVE_LENGTH) return bytes.subarray(0, CLAVE_LENGTH);
  return Buffer.concat([bytes, Buffer.alloc(CLAVE_LENGTH - bytes.length)]);
}

module.exports = { verifyPassword, buildClave };
