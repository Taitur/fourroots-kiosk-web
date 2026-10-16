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

module.exports = { verifyPassword };
