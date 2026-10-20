/* =====================================================================
   Marcajes de asistencia de prueba — Kiosco_FourRoots
   =====================================================================
   NO se ha ejecutado contra ninguna base de datos. Revísalo y corre
   este script tú mismo (idealmente contra una copia de desarrollo).

   Crea la tabla kio_tbMarcajes (si no existe) y la llena con marcajes
   diarios de Enero a Octubre de 2026 para el empleado 95001 (mismo
   placeholder que usa seed_test_data.sql). attendanceModel.js calcula
   Faltas / Llegadas tarde / Llegadas temprano / Horas extra a partir
   de esta tabla.

   Reemplaza 95001 por el iId real de tu usuario de prueba si usaste
   otro valor en seed_test_data.sql / seed_test_user.sql.

   Idempotente: se puede ejecutar varias veces sin duplicar filas
   (UNIQUE en iIdEmpleado + dtFecha).
   ===================================================================== */

SET NOCOUNT ON;

/* ---------------------------------------------------------------------
   0. Tabla kio_tbMarcajes
   --------------------------------------------------------------------- */
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'kio_tbMarcajes')
BEGIN
  CREATE TABLE kio_tbMarcajes (
    iIdMarcaje                INT IDENTITY(1,1) PRIMARY KEY,
    iIdEmpleado               INT NOT NULL,
    iIdCompania                INT NOT NULL DEFAULT 1,
    dtFecha                    DATE NOT NULL,
    dtHoraEntradaProgramada    DATETIME NULL,
    dtHoraSalidaProgramada     DATETIME NULL,
    dtHoraEntrada              DATETIME NULL,  -- NULL = falta ese día
    dtHoraSalida               DATETIME NULL,
    bFalta                     BIT NOT NULL DEFAULT 0,
    dtFechaRegistro            DATETIME NOT NULL DEFAULT GETDATE(),
    CONSTRAINT UQ_kio_tbMarcajes_Empleado_Fecha UNIQUE (iIdEmpleado, dtFecha)
  );
END

/* ---------------------------------------------------------------------
   1. Marcajes de prueba para el empleado 95001
      Horario base: entrada 09:00, salida 18:00.
      Patrón que se repite cada 10 días laborables para variar métricas:
        día 1: normal
        día 2: llegada tarde (09:25)
        día 3: llegada temprano (08:40)
        día 4: horas extra (salida 20:15)
        día 5: falta (sin marcaje)
        día 6-10: normal
   --------------------------------------------------------------------- */
;WITH Fechas AS (
  SELECT CAST('2026-01-01' AS date) AS dtFecha
  UNION ALL
  SELECT DATEADD(day, 1, dtFecha) FROM Fechas WHERE dtFecha < '2026-10-19'
),
Laborables AS (
  SELECT dtFecha, ROW_NUMBER() OVER (ORDER BY dtFecha) AS rn
  FROM Fechas
  WHERE DATEPART(weekday, dtFecha) NOT IN (1, 7) -- sin domingo/sábado (asume @@DATEFIRST=7)
)
INSERT INTO kio_tbMarcajes
  (iIdEmpleado, iIdCompania, dtFecha, dtHoraEntradaProgramada, dtHoraSalidaProgramada,
   dtHoraEntrada, dtHoraSalida, bFalta)
SELECT
  95001,
  1,
  l.dtFecha,
  DATEADD(hour, 9, CAST(l.dtFecha AS datetime)),
  DATEADD(hour, 18, CAST(l.dtFecha AS datetime)),
  CASE (l.rn % 5)
    WHEN 2 THEN DATEADD(minute, 9 * 60 + 25, CAST(l.dtFecha AS datetime)) -- tarde
    WHEN 3 THEN DATEADD(minute, 8 * 60 + 40, CAST(l.dtFecha AS datetime)) -- temprano
    WHEN 0 THEN NULL                                                      -- falta
    ELSE DATEADD(hour, 9, CAST(l.dtFecha AS datetime))                    -- normal
  END,
  CASE (l.rn % 5)
    WHEN 4 THEN DATEADD(minute, 20 * 60 + 15, CAST(l.dtFecha AS datetime)) -- horas extra
    WHEN 0 THEN NULL                                                       -- falta
    ELSE DATEADD(hour, 18, CAST(l.dtFecha AS datetime))                    -- normal
  END,
  CASE WHEN (l.rn % 5) = 0 THEN 1 ELSE 0 END
FROM Laborables l
WHERE NOT EXISTS (
  SELECT 1 FROM kio_tbMarcajes m WHERE m.iIdEmpleado = 95001 AND m.dtFecha = l.dtFecha
)
OPTION (MAXRECURSION 400);

/* =====================================================================
   Resultado aproximado para 95001 (Ene–Oct 2026, ~220 días laborables):
     - ~1 de cada 5 días: falta
     - ~1 de cada 5 días: llegada tarde
     - ~1 de cada 5 días: llegada temprano
     - ~1 de cada 5 días: horas extra (~2.25h por día con horas extra)
     - ~1 de cada 5 días: normal
   ===================================================================== */
