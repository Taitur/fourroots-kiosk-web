const resetModel = require('../models/resetModel');

async function registrarActividad(req, res) {
    try {
        const {
            idactividad,
            idusuario,
            idusuarioregistro
        } = req.body;

        if (!idactividad || !idusuario || !idusuarioregistro) {
            return res.status(400).json({
                error: 'Faltan datos requeridos'
            });
        }

        await resetModel.registrarActividad(
            idactividad,
            idusuario,
            idusuarioregistro
        );

        return res.status(200).json({
            mensaje: 'Actividad registrada correctamente'
        });

    } catch (error) {
        console.error('Error al registrar actividad Reset:', error);

        return res.status(500).json({
            error: 'Error al registrar actividad Reset'
        });
    }
}

async function consultarActividades(req, res) {
    try {
        const idusuario = Number(req.params.idusuario);

        const idactividad = req.query.idactividad
            ? Number(req.query.idactividad)
            : null;

        if (!idusuario) {
            return res.status(400).json({
                error: 'Falta idusuario'
            });
        }

        const actividades = await resetModel.consultarActividades(
            idusuario,
            idactividad
        );

        return res.status(200).json({
            actividades
        });

    } catch (error) {
        console.error('Error al consultar actividades Reset:', error);

        return res.status(500).json({
            error: 'Error al consultar actividades Reset'
        });
    }
}

module.exports = {
    registrarActividad,
    consultarActividades
};