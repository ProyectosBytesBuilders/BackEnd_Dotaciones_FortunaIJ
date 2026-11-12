import jwt from 'jsonwebtoken';

const ALGORITHM = 'HS256';
const EXPIRES_IN = '1h';

// Crea el token. El payload es legible por cualquiera: NUNCA incluyas contraseñas ni datos sensibles.
const generateToken = ( payload ) => {
    return jwt.sign( payload, process.env.JWT_SECRET, {
        algorithm: ALGORITHM,
        expiresIn: EXPIRES_IN
    });
}

// Devuelve el payload si el token es válido; null si es inválido, fue alterado o ya expiró.
const validateToken = ( token ) => {
    try {
        return jwt.verify( token, process.env.JWT_SECRET, { algorithms: [ ALGORITHM ] } );
    }
    catch ( error ) {
        return null;
    }
}

export {
    generateToken,
    validateToken
}
