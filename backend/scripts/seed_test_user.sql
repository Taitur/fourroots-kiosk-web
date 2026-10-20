/* =====================================================================
   Usuario de login de prueba — Kiosco_FourRoots
   =====================================================================
   NO se ha ejecutado contra ninguna base de datos. Revísalo y corre
   este script tú mismo (idealmente contra una copia de desarrollo).

   Crea un único usuario Colaborador (no admin) en kio_tbUsuarios, con
   iId = 95001 para que quede ligado al "empleado" de recursos/empleados
   que inserta seed_test_data.sql (cumpleaños en Engage, ascenso en
   Asistencia, vacaciones e incidencias de prueba).

   Credenciales:
     usuario: colaborador.prueba
     clave:   Prueba123

   La clave se guarda en texto plano (rellenada con ceros a 50 bytes)
   porque así la valida helpers/password.js (verifyPassword) hoy en día.

   Idempotente: se puede ejecutar varias veces sin duplicar filas.
   ===================================================================== */

SET NOCOUNT ON;

IF NOT EXISTS (SELECT 1 FROM kio_tbUsuarios WHERE iIdUsuario = 95001)
  INSERT INTO kio_tbUsuarios
    (iIdUsuario, iIdUsuarioRegistro, dtFechaRegistro, iIdCompania, iId, vcUsuario, vcClave,
     vcPreguntaSecreta, vcRespuestaSecreta, bActivo, dtFechaClave, bForrzarCambioClave, bBorrado)
  VALUES
    (95001, 95001, GETDATE(), 1, 95001, 'colaborador.prueba', CAST('Prueba123' AS BINARY(50)),
     '', '', 1, GETDATE(), 0, 0);
