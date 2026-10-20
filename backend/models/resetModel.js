const { sql, getConnection } = require('../db');

const SP_REGISTRAR = 'dbo.sp_Reset_RegistrarActividadUsuario';
const SP_CONSULTAR = 'dbo.sp_Reset_ConsultarActividadesUsuario';

async function registrarActividad(idActividad, idUsuario, idUsuarioRegistro) {
    const pool = await getConnection();

    await pool.request()
        .input('idactividad', sql.Decimal(18, 0), idActividad)
        .input('idusuario', sql.Decimal(18, 0), idUsuario)
        .input('idusuarioregistro', sql.Decimal(18, 0), idUsuarioRegistro)
        .execute(SP_REGISTRAR);

    return { ok: true };
}

async function consultarActividades(idUsuario, idActividad = null) {
    const pool = await getConnection();

    const request = pool.request()
        .input('idusuario', sql.Decimal(18, 0), idUsuario)
        .input('idactividad', sql.Decimal(18, 0), idActividad);

    const resultado = await request.execute(SP_CONSULTAR);

    return resultado.recordset;
}

module.exports = {
    registrarActividad,
    consultarActividades
};