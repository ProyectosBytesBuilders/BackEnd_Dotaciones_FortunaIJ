
import PqrsModel from '../models/pqrs.model.js';

// Registrar una nueva PQRS en la base de datos
const dbCreatePqrs = async (newPqrs) => {
    return await PqrsModel.create(newPqrs);
};

// Consultar todas las PQRS registradas
const dbGetPqrs = async () => {
    return await PqrsModel.find().sort({ fecha: -1 });
};

// Consultar una PQRS por su identificador
const dbGetPqrsById = async (id) => {
    return await PqrsModel.findById(id);
};

// Reemplazar la información de una PQRS
const dbReplacePqrs = async (id, pqrsUpdated) => {
    return await PqrsModel.findOneAndReplace(
        { _id: id },
        pqrsUpdated,
        {
            new: true,
            runValidators: true
        }
    );
};

// Actualizar uno o varios campos de una PQRS
const dbPatchPqrs = async (id, pqrsUpdated) => {
    return await PqrsModel.findOneAndUpdate(
        { _id: id },
        { $set: pqrsUpdated },
        {
            new: true,
            runValidators: true
        }
    );
};

// Eliminar una PQRS por su identificador
const dbDeletePqrs = async (id) => {
    return await PqrsModel.findByIdAndDelete(id);
};

export {
    dbCreatePqrs,
    dbGetPqrs,
    dbGetPqrsById,
    dbReplacePqrs,
    dbPatchPqrs,
    dbDeletePqrs
};
