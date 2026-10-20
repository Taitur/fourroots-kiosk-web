/* =====================================================================
   Posts y comentarios de Engage — Kiosco_FourRoots
   =====================================================================
   NO se ha ejecutado contra ninguna base de datos. Revísalo y corre
   este script tú mismo (idealmente contra una copia de desarrollo).

   Crea las tablas kio_tbEngagePosts y kio_tbEngageComentarios, usadas
   por engageModel.js para que cualquier usuario autenticado pueda
   publicar en el feed de Home y que otros usuarios puedan responder.

   A diferencia de kio_tbNoticias, kio_tbEncuestas, etc. (tablas
   heredadas del sistema original, sin IDENTITY), estas dos tablas son
   nuevas, así que sí usan IDENTITY normal.

   Idempotente: CREATE TABLE solo corre si la tabla no existe todavía.
   ===================================================================== */

SET NOCOUNT ON;

/* ---------------------------------------------------------------------
   1. kio_tbEngagePosts — publicaciones de usuarios en el feed de Home
   --------------------------------------------------------------------- */
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'kio_tbEngagePosts')
BEGIN
  CREATE TABLE kio_tbEngagePosts (
    iIdPost         INT IDENTITY(1,1) PRIMARY KEY,
    iIdAutor        INT NOT NULL,
    vcTexto         NVARCHAR(MAX) NOT NULL,
    dtFechaRegistro DATETIME NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_kio_tbEngagePosts_Autor FOREIGN KEY (iIdAutor) REFERENCES kio_tbUsuarios (iIdUsuario)
  );
END

/* ---------------------------------------------------------------------
   2. kio_tbEngageComentarios — respuestas a una publicación
   --------------------------------------------------------------------- */
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'kio_tbEngageComentarios')
BEGIN
  CREATE TABLE kio_tbEngageComentarios (
    iIdComentario   INT IDENTITY(1,1) PRIMARY KEY,
    iIdPost         INT NOT NULL,
    iIdAutor        INT NOT NULL,
    vcTexto         NVARCHAR(500) NOT NULL,
    dtFechaRegistro DATETIME NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_kio_tbEngageComentarios_Post FOREIGN KEY (iIdPost) REFERENCES kio_tbEngagePosts (iIdPost),
    CONSTRAINT FK_kio_tbEngageComentarios_Autor FOREIGN KEY (iIdAutor) REFERENCES kio_tbUsuarios (iIdUsuario)
  );
END

/* ---------------------------------------------------------------------
   3. Datos de prueba opcionales (comenta este bloque si no los quieres)
   --------------------------------------------------------------------- */
IF NOT EXISTS (SELECT 1 FROM kio_tbEngagePosts WHERE iIdAutor = 1)
BEGIN
  INSERT INTO kio_tbEngagePosts (iIdAutor, vcTexto, dtFechaRegistro)
  VALUES (1, '¡Bienvenidos al nuevo feed de Engage! Aquí puedes compartir lo que quieras con el equipo.', GETDATE());
END
