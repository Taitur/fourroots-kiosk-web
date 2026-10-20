// Node < 22 no trae Promise.withResolvers y mssql lo usa. Solo se define si falta.
if (!Promise.withResolvers) {
  Promise.withResolvers = function () {
    let resolve, reject;
    const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
    return { promise, resolve, reject };
  };
}

const path = require("path");

// Debe cargarse antes que cualquier otro módulo: db.js lee process.env al importarse.
require("dotenv").config({ path: path.join(__dirname, ".env"), quiet: true });

const app = require("./app");

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`API Eslabon escuchando en http://localhost:${port}/api`);
  if (process.env.SERVE_FRONTEND !== "false") console.log(`Frontend en http://localhost:${port}/`);
});
