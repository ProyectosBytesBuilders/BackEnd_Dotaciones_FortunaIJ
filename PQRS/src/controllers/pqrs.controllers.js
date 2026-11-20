
import {
    dbCreatePqrs,
    dbGetPqrs,
    dbGetPqrsById,
    dbReplacePqrs,
    dbPatchPqrs,
    dbDeletePqrs
} from '../services/pqrs.services.js';
import handleMongooseError from '../helpers/handle-mongoose-error.helper.js';

// Registrar una PQRS
const createPqrs = async (req, res) => {
    try {
        // Extrae los datos enviados desde Bruno o el cliente que consume la API
        const inputData = req.body;

        // Usa el servicio para guardar la PQRS en MongoDB
        const data = await dbCreatePqrs(inputData);

        res.status(201).json({
            statusCode: 201,
            msg: 'PQRS registrada correctamente',
            data
        });
    } catch (error) {
        console.error(error);
        const errors = handleMongooseError(error);

        if (errors) {
            return res.status(400).json({
                statusCode: 400,
                msg: 'Los datos enviados no son válidos',
                errors
            });
        }

        res.status(500).json({
            statusCode: 500,
            msg: 'No se pudo registrar la PQRS'
        });
    }
};

// Consultar todas las PQRS
const getPqrs = async (req, res) => {
    try {
        const data = await dbGetPqrs();

        res.status(200).json({
            statusCode: 200,
            msg: 'Lista de PQRS',
            total: data.length,
            data
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            statusCode: 500,
            msg: 'No se pudieron obtener las PQRS'
        });
    }
};

// Consultar una PQRS por su ID
const getPqrsById = async (req, res) => {
    try {
        const id = req.params.id;
        const data = await dbGetPqrsById(id);

        if (!data) {
            return res.status(404).json({
                statusCode: 404,
                msg: 'No se encontró la PQRS solicitada'
            });
        }

        res.status(200).json({
            statusCode: 200,
            msg: 'PQRS encontrada',
            data
        });
    } catch (error) {
        console.error(error);
        const errors = handleMongooseError(error);

        if (errors) {
            return res.status(400).json({
                statusCode: 400,
                msg: 'El identificador enviado no es válido',
                errors
            });
        }

        res.status(500).json({
            statusCode: 500,
            msg: 'No se pudo consultar la PQRS'
        });
    }
};

// Reemplazar todos los datos de una PQRS (PUT)
const replacePqrs = async (req, res) => {
    try {
        const id = req.params.id;
        const inputData = req.body;

        // Para reemplazar el documento se requieren sus campos principales
        if (!inputData.tipo || !inputData.descripcion) {
            return res.status(400).json({
                statusCode: 400,
                msg: 'Para actualizar la PQRS con PUT debes enviar tipo y descripcion'
            });
        }

        const data = await dbReplacePqrs(id, inputData);

        if (!data) {
            return res.status(404).json({
                statusCode: 404,
                msg: 'No se encontró la PQRS para actualizar'
            });
        }

        res.status(200).json({
            statusCode: 200,
            msg: 'PQRS reemplazada correctamente',
            data
        });
    } catch (error) {
        console.error(error);
        const errors = handleMongooseError(error);

        if (errors) {
            return res.status(400).json({
                statusCode: 400,
                msg: 'No se pudo reemplazar la PQRS con los datos enviados',
                errors
            });
        }

        res.status(500).json({
            statusCode: 500,
            msg: 'No se pudo actualizar la PQRS'
        });
    }
};

// Actualizar uno o varios campos de una PQRS (PATCH)
const patchPqrs = async (req, res) => {
    try {
        const id = req.params.id;
        const inputData = req.body;

        if (!inputData || Object.keys(inputData).length === 0) {
            return res.status(400).json({
                statusCode: 400,
                msg: 'Debes enviar al menos un campo para actualizar'
            });
        }

        // Evita modificar el identificador del documento desde el body
        delete inputData._id;
        delete inputData.createdAt;
        delete inputData.updatedAt;

        const data = await dbPatchPqrs(id, inputData);

        if (!data) {
            return res.status(404).json({
                statusCode: 404,
                msg: 'No se encontró la PQRS para actualizar'
            });
        }

        res.status(200).json({
            statusCode: 200,
            msg: 'PQRS actualizada correctamente',
            data
        });
    } catch (error) {
        console.error(error);
        const errors = handleMongooseError(error);

        if (errors) {
            return res.status(400).json({
                statusCode: 400,
                msg: 'No se pudo actualizar la PQRS con los datos enviados',
                errors
            });
        }

        res.status(500).json({
            statusCode: 500,
            msg: 'No se pudo actualizar la PQRS'
        });
    }
};

// Eliminar una PQRS por su ID
const deletePqrs = async (req, res) => {
    try {
        const id = req.params.id;
        const data = await dbDeletePqrs(id);

        if (!data) {
            return res.status(404).json({
                statusCode: 404,
                msg: 'No se encontró la PQRS para eliminar'
            });
        }

        res.status(200).json({
            statusCode: 200,
            msg: 'PQRS eliminada correctamente',
            data
        });
    } catch (error) {
        console.error(error);
        const errors = handleMongooseError(error);

        if (errors) {
            return res.status(400).json({
                statusCode: 400,
                msg: 'No se pudo eliminar la PQRS: el ID no es válido',
                errors
            });
        }

        res.status(500).json({
            statusCode: 500,
            msg: 'No se pudo eliminar la PQRS'
        });
    }
};

export {
    createPqrs,
    getPqrs,
    getPqrsById,
    replacePqrs,
    patchPqrs,
    deletePqrs
};
