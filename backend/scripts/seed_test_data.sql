/* =====================================================================
   Datos de prueba — Kiosco_FourRoots
   =====================================================================
   NO se ha ejecutado contra ninguna base de datos. Revísalo y corre
   este script tú mismo contra el entorno donde quieras probar
   (idealmente una copia de desarrollo, no la BD compartida/real).

   Es idempotente: se puede ejecutar varias veces sin duplicar filas.
   Usa IDs altos (90000+) para no chocar con datos reales existentes.

   No crea usuarios de login (kio_tbUsuarios): se asume que ya existen
   usuarios de prueba. El script NO usa variables (DECLARE) porque
   muchos clientes SQL ejecutan cada sentencia como una conexión/batch
   separado y las pierden. En su lugar usa los IDs 95001 (colaborador)
   y 95002 (admin) como placeholders: busca y reemplaza esos dos
   números en todo el archivo por los iIdUsuario reales de tus usuarios
   de prueba antes de ejecutar.

   IMPORTANTE sobre 95001/95002: aquí también se usan como el "id de
   empleado" (recursos.id, iIdEmpleado) para que el cumpleaños de Engage
   y los ascensos de Asistencia aparezcan. Para que eso se vea en la
   pantalla de tu usuario de prueba, ese usuario debe tener
   kio_tbUsuarios.iId = 95001 (o el valor que elijas). Si tu usuario de
   prueba ya tiene un iId real (empleado existente), usa ese número en
   vez de 95001 en las secciones de recursos/asistencia/engage.
   No se inserta en la tabla `empleados` (no hace falta: ninguna tabla
   usada aquí tiene FK a ella).

   Cubre:
     1. recursos                       -> datos del "empleado" base (cumpleaños)
     2. kio_tbAvatarUsuario            -> módulo Avatar
     3. kio_tbSolIncrementoSueldo      -> módulo Asistencia (ascensos)
     4. kio_tbSolicitudesUsuarios/kio_tbSolVacaciones -> módulo Vacaciones
     5. kio_tbSolicitudesUsuarios/kio_tbAvisosMultiples/kio_tbEventosSolAvisos -> Incidencias
     6. kio_tbNoticias, kio_tbEncuestas, kio_tbencuestasusuario, kio_Apla_SolAplauso -> Engage
     7. kio_tbMensajes                 -> Notificaciones
     8. kio_tbDepartamentos, kio_tbJugadores, kio_tbPreguntasCreadas -> Juego de preguntas
   ===================================================================== */

SET NOCOUNT ON;

/* ---------------------------------------------------------------------
   1. recursos (datos de "empleado" base, solo para el cumpleaños de Engage)
   --------------------------------------------------------------------- */
IF NOT EXISTS (SELECT 1 FROM recursos WHERE id = 95001)
  INSERT INTO recursos (id, nombre, paterno, materno, fecha_nacimiento)
  VALUES (95001, 'Ana', 'García', 'López', DATEFROMPARTS(YEAR(GETDATE()) - 29, MONTH(GETDATE()), DAY(GETDATE())));
  -- cumpleaños = hoy, para probar el bloque de cumpleaños de Engage

IF NOT EXISTS (SELECT 1 FROM recursos WHERE id = 95002)
  INSERT INTO recursos (id, nombre, paterno, materno, fecha_nacimiento)
  VALUES (95002, 'Carlos', 'Mendoza', 'Ruiz', '1990-03-14');

-- empleados: legacy con ~35 columnas NOT NULL sin default; se rellenan con
-- valores neutros (0/'') salvo antiguedad_anios/antiguedad_meses, que sí
-- lee attendanceModel.getEmployeeInfo para mostrar la antigüedad.
IF NOT EXISTS (SELECT 1 FROM empleados WHERE id = 95001)
  INSERT INTO empleados
    (compania, id, usuario, fecha_registro, fecha_modificacion, empleado, nomina, jerarquia, sindicato, turno,
     jornada, moneda_original, fecha_alta, fecha_antiguedad, fecha_sindicato, fecha_turno, fecha_nomina, fecha_jornada,
     cedula_imss, tarjeta_asistencia, captura_diaria, antiguedad_anios, antiguedad_meses, antiguedad_dias,
     integracion_manual, tipo_pago, zona, expediente_infonavit, cuenta_individual, cuenta_afore, unidad_medica,
     sucursal_imss, sucursal_afore, estatus, aplicar_imss, periodos_promedio)
  VALUES
    (1, 95001, 'SEED_TEST_DATA', GETDATE(), GETDATE(), 95001, 0, 0, 0, 1,
     0, 0, GETDATE(), GETDATE(), GETDATE(), GETDATE(), GETDATE(), GETDATE(),
     '', 0, 0, 3, 7, 0,
     0, 0, 0, '', '', '', '',
     0, '', 1, 0, 0);

IF NOT EXISTS (SELECT 1 FROM empleados WHERE id = 95002)
  INSERT INTO empleados
    (compania, id, usuario, fecha_registro, fecha_modificacion, empleado, nomina, jerarquia, sindicato, turno,
     jornada, moneda_original, fecha_alta, fecha_antiguedad, fecha_sindicato, fecha_turno, fecha_nomina, fecha_jornada,
     cedula_imss, tarjeta_asistencia, captura_diaria, antiguedad_anios, antiguedad_meses, antiguedad_dias,
     integracion_manual, tipo_pago, zona, expediente_infonavit, cuenta_individual, cuenta_afore, unidad_medica,
     sucursal_imss, sucursal_afore, estatus, aplicar_imss, periodos_promedio)
  VALUES
    (1, 95002, 'SEED_TEST_DATA', GETDATE(), GETDATE(), 95002, 0, 0, 0, 2,
     0, 0, GETDATE(), GETDATE(), GETDATE(), GETDATE(), GETDATE(), GETDATE(),
     '', 0, 0, 1, 2, 0,
     0, 0, 0, '', '', '', '',
     0, '', 1, 0, 0);

/* ---------------------------------------------------------------------
   2. kio_tbAvatarUsuario — avatar guardado para 95001
      (95002 se deja sin fila para probar el avatar por defecto).
   --------------------------------------------------------------------- */
MERGE kio_tbAvatarUsuario AS destino
USING (SELECT 2 AS iidusuario) AS origen
  ON destino.iidusuario = origen.iidusuario
WHEN NOT MATCHED THEN INSERT
  (iidusuario, vcTonopiel, vcEstiloCabello, vcColorCabello, vcEstiloRostro, vcEstiloRopa, vcColorRopa, vcEstiloAccesorio,
   dtFechaRegistro, dtFechaModificacion)
  VALUES (2, '#E0AC69', 'curly', '#5B3A29', 'happy', 'hoodie', '#2F7BF0', 'glasses', GETDATE(), GETDATE());

/* ---------------------------------------------------------------------
   3. kio_tbSolIncrementoSueldo — un ascenso para 95001 (módulo Asistencia)
   --------------------------------------------------------------------- */
IF NOT EXISTS (SELECT 1 FROM kio_tbSolIncrementoSueldo WHERE iIdEmpleado = 95001 AND vcMotivoModificacion = 'SEED_TEST_DATA')
  INSERT INTO kio_tbSolIncrementoSueldo
    (iIdSolicitudUsuario, iIdUsuario, dtFechaRegistro, dtFechaModificacion, iIdUsuarioIncremento, iIdCompania,
     iIdEmpleado, iIdSucursal, iIdPuesto, iIdDepartamento, fSueldoMensual, fSueldoDiario, fPctjeIncremento,
     vcMotivoModificacion, iIdPuestoAnt, iIdDepartamentoAnt, fSueldoMensualAnt, fSueldoDiarioAnt,
     dtUltimaModifSueldo, dtFechaPropuesta, iIdUsuarioAut1, iIdUsuarioAut2, iIdUsuarioAut3, iIdUsuarioAut4, iIdUsuarioAut5)
  VALUES
    (90201, 2, GETDATE(), GETDATE(), 1, 1,
     95001, 0, 0, 0, 0, 0, 0,
     'SEED_TEST_DATA', 0, 0, 0, 0,
     GETDATE(), DATEADD(month, -2, CAST(GETDATE() AS date)), 0, 0, 0, 0, 0);

/* ---------------------------------------------------------------------
   4. Vacaciones — una solicitud "En proceso" de 3 días para
      95001 (iIdSolicitud = 1, tiEstatus = 3; ver vacationModel.js)
   --------------------------------------------------------------------- */
IF NOT EXISTS (SELECT 1 FROM kio_tbSolicitudesUsuarios WHERE iIdSolicitudUsuario = 90101)
BEGIN
  INSERT INTO kio_tbSolicitudesUsuarios
    (iIdSolicitudUsuario, iIdUsuario, dtFechaRegistro, iIdSolicitud, iIdUsuarioSolicitante, tiEstatus)
  VALUES (90101, 2, GETDATE(), 1, 2, 3);

  INSERT INTO kio_tbSolVacaciones
    (iIdSolicitudUsuario, iIdUsuario, dtFechaRegistro, dtFechaInicio, iDias, iAntiguedad, clave_mvto,
     dtFechaFin, dtFechaRegresa, iDiasSabados, iDiasDomingos, iDiasFestivos, IIDEMPLEADO, IIDCOMPANIA)
  VALUES
    (90101, 2, GETDATE(), DATEADD(day, 7, CAST(GETDATE() AS date)), 3, 0, 1,
     DATEADD(day, 9, CAST(GETDATE() AS date)), DATEADD(day, 10, CAST(GETDATE() AS date)), 0, 0, 0, 95001, 1);
END

/* ---------------------------------------------------------------------
   5. Incidencias — una solicitud "En proceso" de cita médica (hours) para
      95001 (iIdSolicitud = 16, tiEstatus = 3; ver incidenceModel.js)
   --------------------------------------------------------------------- */
IF NOT EXISTS (SELECT 1 FROM kio_tbSolicitudesUsuarios WHERE iIdSolicitudUsuario = 90102)
BEGIN
  INSERT INTO kio_tbSolicitudesUsuarios
    (iIdSolicitudUsuario, iIdUsuario, dtFechaRegistro, iIdSolicitud, iIdUsuarioSolicitante, tiEstatus)
  VALUES (90102, 2, GETDATE(), 16, 2, 3);

  INSERT INTO kio_tbAvisosMultiples
    (id_empleado, nombre, fecha_aplicacion, id_evento, idusuario, fecha_registro, fecha_modificacion,
     solicitado_horas, autorizado_horas, inicio, fin, id_motivo, iidsolicitudusuario, estatus)
  VALUES
    (95001, 'Ana García López', DATEADD(day, 3, CAST(GETDATE() AS date)), 2, 2, GETDATE(), GETDATE(),
     2, 0, DATEADD(hour, 10, DATEADD(day, 3, CAST(GETDATE() AS datetime))), DATEADD(hour, 12, DATEADD(day, 3, CAST(GETDATE() AS datetime))),
     0, 90102, 3);

  INSERT INTO kio_tbEventosSolAvisos (iIdSolicitudUsuario, iIdEvento, vcDescripcion, iIdMotivo, dtFechaAplicacion)
  VALUES (90102, 2, 'Consulta de rutina', 0, DATEADD(day, 3, CAST(GETDATE() AS date)));
END

/* ---------------------------------------------------------------------
   6. Engage — noticia, encuesta (+ 1 voto), aplauso. Los cumpleaños salen
      solos de recursos (95001 ya tiene fecha_nacimiento = hoy).
   --------------------------------------------------------------------- */
IF NOT EXISTS (SELECT 1 FROM kio_tbNoticias WHERE iIdNoticia = 90001)
  INSERT INTO kio_tbNoticias
    (iIdNoticia, iIdUsuario, vcTitulo, vcResumen, tTexto, dtFechaRegistro, dtFechaVigencia, bActivo, tiPrioridad, iIdUsuarioAutor)
  VALUES
    (90001, 1, 'Bienvenida al nuevo kiosco', 'Ya puedes usar el portal de autoservicio.',
     'Ya puedes usar el nuevo portal de autoservicio para revisar asistencia, vacaciones e incidencias.',
     GETDATE(), DATEADD(month, 1, CAST(GETDATE() AS date)), 1, 1, 1);

IF NOT EXISTS (SELECT 1 FROM kio_tbEncuestas WHERE iIdEncuesta = 90001)
  INSERT INTO kio_tbEncuestas (iIdEncuesta, iIdUsuario, vcPregunta, smmostrar, dtVigencia, dtFechaRegistro)
  VALUES (90001, 1, '¿Qué tan útil te parece el nuevo kiosco?', 1, DATEADD(month, 1, CAST(GETDATE() AS date)), GETDATE());

IF NOT EXISTS (SELECT 1 FROM kio_tbencuestasusuario WHERE iidencuesta = 90001 AND iidusuariovota = 1)
  INSERT INTO kio_tbencuestasusuario (iidencuesta, iidusuariovota, dtfecharegistro, dtfechamodificacion)
  VALUES (90001, 1, GETDATE(), GETDATE());

IF NOT EXISTS (SELECT 1 FROM kio_Apla_SolAplauso WHERE idSolicitudUsuario = 90001)
  INSERT INTO kio_Apla_SolAplauso (idSolicitudUsuario, NombreEmpleado, FechaElaboracion)
  VALUES (90001, 'Carlos Mendoza Ruiz', GETDATE());

/* ---------------------------------------------------------------------
   7. Notificaciones — 2 mensajes para 95001 (uno leído, uno sin leer)
   --------------------------------------------------------------------- */
IF NOT EXISTS (SELECT 1 FROM kio_tbMensajes WHERE iIdMensaje = 90001)
  INSERT INTO kio_tbMensajes
    (iIdMensaje, iIdUsuario, iIdUsuarioReceptor, iIdUsuarioEmisor, vcTitulo, tTexto, dtFechaEnvio, dtFechaRegistro,
     bLeido, bEnviado, bUrgente, bBorradoEmisor, bBorradoReceptor)
  VALUES
    (90001, 2, 2, 1, 'Solicitud de vacaciones recibida',
     'Tu solicitud de vacaciones fue registrada y está en proceso de revisión.',
     GETDATE(), GETDATE(), 0, 1, 0, 0, 0);

IF NOT EXISTS (SELECT 1 FROM kio_tbMensajes WHERE iIdMensaje = 90002)
  INSERT INTO kio_tbMensajes
    (iIdMensaje, iIdUsuario, iIdUsuarioReceptor, iIdUsuarioEmisor, vcTitulo, tTexto, dtFechaEnvio, dtFechaRegistro,
     bLeido, bEnviado, bUrgente, bBorradoEmisor, bBorradoReceptor)
  VALUES
    (90002, 2, 2, 1, 'Recordatorio de capacitación',
     'No olvides completar el curso de inducción antes de fin de mes.',
     DATEADD(day, -2, GETDATE()), DATEADD(day, -2, GETDATE()), 1, 1, 0, 0, 0);

/* ---------------------------------------------------------------------
   8. Juego de preguntas (routes/juegos.js) — departamento + 2 jugadores
      + 1 pregunta sin responder (para probar matchmaking/responder)
   --------------------------------------------------------------------- */
IF NOT EXISTS (SELECT 1 FROM kio_tbDepartamentos WHERE vcNombre = 'Capital Humano (prueba)')
  INSERT INTO kio_tbDepartamentos (vcNombre) VALUES ('Capital Humano (prueba)');

IF NOT EXISTS (SELECT 1 FROM kio_tbJugadores WHERE vcNombre = 'Jugador Prueba 1')
  INSERT INTO kio_tbJugadores (vcNombre, vcPuesto, vcExpertise, iIdDepartamento, iPuntos)
  SELECT 'Jugador Prueba 1', 'Analista', 'Nómina', iIdDepartamento, 0
  FROM kio_tbDepartamentos WHERE vcNombre = 'Capital Humano (prueba)';

IF NOT EXISTS (SELECT 1 FROM kio_tbJugadores WHERE vcNombre = 'Jugador Prueba 2')
  INSERT INTO kio_tbJugadores (vcNombre, vcPuesto, vcExpertise, iIdDepartamento, iPuntos)
  SELECT 'Jugador Prueba 2', 'Coordinador', 'Reclutamiento', iIdDepartamento, 10
  FROM kio_tbDepartamentos WHERE vcNombre = 'Capital Humano (prueba)';

-- vcOficinaId + iSlotIndex tiene UNIQUE KEY (UQ_Slot): se usa una oficina de
-- prueba dedicada para no chocar con slots reales ya ocupados.
IF NOT EXISTS (SELECT 1 FROM kio_tbPreguntasCreadas WHERE vcOficinaId = 'OficinaPrueba' AND iSlotIndex = 0)
  INSERT INTO kio_tbPreguntasCreadas (iIdAutor, iIdDepartamento, vcEnunciado, vcOficinaId, iSlotIndex)
  SELECT j.iIdJugador, j.iIdDepartamento, '¿Cuántos días de aguinaldo de ley hay en México?', 'OficinaPrueba', 0
  FROM kio_tbJugadores j WHERE j.vcNombre = 'Jugador Prueba 1';

/* =====================================================================
   Usa los usuarios de prueba que ya existan en kio_tbUsuarios; solo
   ajusta 95001/95002 al inicio del script.
   ===================================================================== */
