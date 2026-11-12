/**
 * Convierte los errores de Mongoose en un objeto { campo: mensaje }.
 * Devuelve null si el error no es de Mongoose (en ese caso es un error 500).
 */
const handleMongooseError = ( error ) => {
    // 1. Validación del Schema (required, minlength, match, enum, ...)
    if ( error.name === 'ValidationError' ) {
        const errors = {};

        for ( const field in error.errors ) {
            errors[ field ] = error.errors[ field ].message;
        }

        return errors;
    }

    // 2. Valor único duplicado (ej: correo ya registrado)
    if ( error.code === 11000 ) {
        const field = Object.keys( error.keyValue )[ 0 ];

        return {
            [ field ]: `El ${ field } '${ error.keyValue[ field ] }' ya se encuentra registrado`
        };
    }

    // 3. Id con formato inválido
    if ( error.name === 'CastError' ) {
        return {
            [ error.path ]: `El identificador '${ error.value }' no tiene un formato válido de MongoDB`
        };
    }

    return null;
};

export default handleMongooseError;
