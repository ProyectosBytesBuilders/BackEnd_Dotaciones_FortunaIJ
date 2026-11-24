import mongoose from 'mongoose';

// Verifica si un identificador cumple el formato ObjectId de MongoDB
const isValidObjectId = ( id ) => {
    return typeof id === 'string' && mongoose.Types.ObjectId.isValid( id );
};

// Evita inyección NoSQL asegurando que el valor sea texto real no vacío
const isNonEmptyString = ( value ) => {
    return typeof value === 'string' && value.trim().length > 0;
};

// Valida números estrictamente mayores a cero (cantidades de entrada/salida)
const isPositiveNumber = ( value ) => {
    return typeof value === 'number' && Number.isFinite( value ) && value > 0;
};

// Valida números mayores o iguales a cero (stock inicial, stock mínimo, precios)
const isNonNegativeNumber = ( value ) => {
    return typeof value === 'number' && Number.isFinite( value ) && value >= 0;
};

// Escapa caracteres especiales de expresiones regulares para búsquedas seguras ($regex)
const escapeRegex = ( text = '' ) => {
    return String( text ).replace( /[.*+?^${}()|[\]\\]/g, '\\$&' );
};

export {
    isValidObjectId,
    isNonEmptyString,
    isPositiveNumber,
    isNonNegativeNumber,
    escapeRegex
};