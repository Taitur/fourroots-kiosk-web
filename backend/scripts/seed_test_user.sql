

SET NOCOUNT ON;

IF NOT EXISTS (SELECT 1 FROM kio_tbUsuarios WHERE iIdUsuario = 95001)
  INSERT INTO kio_tbUsuarios
    (iIdUsuario, iIdUsuarioRegistro, dtFechaRegistro, iIdCompania, iId, vcUsuario, vcClave,
     vcPreguntaSecreta, vcRespuestaSecreta, bActivo, dtFechaClave, bForrzarCambioClave, bBorrado)
  VALUES
    (95001, 95001, GETDATE(), 1, 95001, 'colaborador.prueba', CAST('Prueba123' AS BINARY(50)),
     '', '', 1, GETDATE(), 0, 0);
