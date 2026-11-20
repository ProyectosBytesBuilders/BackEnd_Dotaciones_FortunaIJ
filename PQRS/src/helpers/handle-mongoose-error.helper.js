
/**
 * Helper para organizar los errores que puede generar Mongoose.
 * Retorna los errores de validación, duplicados o identificadores inválidos.
 */
const handleMongooseError = (error) => {

    // Error de validación definido en el Schema de Mongoose
    if (error.name === 'ValidationError') {
        const errors = {};

        for (const field in error.errors) {
            errors[field] = error.errors[field].message;
        }

        return errors;
    }

    // Error cuando se intenta registrar un valor único que ya existe
    if (error.code === 11000) {
        const field = error.keyValue
            ? Object.keys(error.keyValue)[0]
            : 'registro';

        return {
            [field]: `El valor de ${field} ya se encuentra registrado`
        };
    }

    // Error cuando el ID no tiene el formato ObjectId de MongoDB
    if (error.name === 'CastError') {
        return {
            [error.path]: `El identificador '${error.value}' no tiene un formato válido de MongoDB`
        };
    }

    // Error cuando se intenta ejecutar una operación con un documento inexistente
    if (error.name === 'DocumentNotFoundError') {
        return {
            documento: 'No se encontró el documento solicitado'
        };
    }

    // Error cuando se presenta una excepción relacionada con MongoDB
    return null;
};

export default handleMongooseError;
