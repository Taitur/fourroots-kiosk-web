/* =====================================================================
   Opciones de encuesta — Kiosco_FourRoots
   =====================================================================
   NO se ha ejecutado contra ninguna base de datos. Revísalo y corre
   este script tú mismo (idealmente contra una copia de desarrollo).

   Por qué hace falta: engageModel.js (getSurveys / castVote) ya lee y
   escribe en kio_tbEncuestasOpciones y en la columna iIdOpcion de
   kio_tbencuestasusuario, pero ninguna de las dos existe todavía en la
   base de datos — ningún script de este repo las crea. Por eso un voto
   siempre falla (error SQL por tabla/columna inexistente), aunque la
   encuesta se vea bien en pantalla.

   Este script:
     1. Crea kio_tbEncuestasOpciones (si no existe).
     2. Agrega la columna iIdOpcion a kio_tbencuestasusuario (si no existe).
     3. Agrega opciones de prueba a la encuesta 90001 (seed_test_data.sql).

   Idempotente: se puede ejecutar varias veces sin duplicar nada.
   ===================================================================== */

SET NOCOUNT ON;

/* ---------------------------------------------------------------------
   1. kio_tbEncuestasOpciones
   --------------------------------------------------------------------- */
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'kio_tbEncuestasOpciones')
BEGIN
  CREATE TABLE kio_tbEncuestasOpciones (
    iIdOpcion       INT IDENTITY(1,1) PRIMARY KEY,
    iIdEncuesta     INT NOT NULL,
    vcOpcion        NVARCHAR(200) NOT NULL,
    CONSTRAINT FK_kio_tbEncuestasOpciones_Encuesta FOREIGN KEY (iIdEncuesta) REFERENCES kio_tbEncuestas (iIdEncuesta)
  );
END

/* ---------------------------------------------------------------------
   2. kio_tbencuestasusuario.iIdOpcion
   --------------------------------------------------------------------- */
IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('kio_tbencuestasusuario') AND name = 'iIdOpcion'
)
BEGIN
  ALTER TABLE kio_tbencuestasusuario ADD iIdOpcion INT NULL
    CONSTRAINT FK_kio_tbencuestasusuario_Opcion FOREIGN KEY REFERENCES kio_tbEncuestasOpciones (iIdOpcion);
END

/* ---------------------------------------------------------------------
   3. Opciones de prueba para la encuesta 90001
   --------------------------------------------------------------------- */
IF NOT EXISTS (SELECT 1 FROM kio_tbEncuestasOpciones WHERE iIdEncuesta = 90001)
BEGIN
  INSERT INTO kio_tbEncuestasOpciones (iIdEncuesta, vcOpcion)
  VALUES
    (90001, 'Muy útil'),
    (90001, 'Algo útil'),
    (90001, 'Poco útil'),
    (90001, 'Nada útil');
END
