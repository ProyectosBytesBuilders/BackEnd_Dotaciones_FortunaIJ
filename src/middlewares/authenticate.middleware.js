import { validateToken } from '../helpers/jwt.helpers.js';
import { dbGetUserById } from '../services/users.services.js';

// AUTENTICACIÓN: ¿quién eres? Exige el header  Authorization: Bearer <token>
const authMiddleware = async ( req, res, next ) => {
    try {
        // Paso 1: Leer el token de la cabecera
        const authHeader = req.header( 'Authorization' );

        if ( ! authHeader || ! authHeader.startsWith( 'Bearer ' ) ) {
            return res.status( 401 ).json({ msg: 'Falta el token. Use el header Authorization: Bearer <token>' });
        }

        const token = authHeader.split( ' ' )[ 1 ];

        // Paso 2: Verificar la firma y la expiración
        const payload = validateToken( token );

        if ( ! payload ) {
            return res.status( 401 ).json({ msg: 'Token inválido o expirado' });
        }

        // Paso 3: Confirmar que el usuario siga existiendo y activo
        // (si lo eliminaron o desactivaron, el token deja de servir aunque no haya expirado)
        const userFound = await dbGetUserById( payload._id );

        if ( ! userFound ) {
            return res.status( 401 ).json({ msg: 'Usuario no registrado o deshabilitado' });
        }

        // Paso 4: Dejar el usuario disponible para los siguientes middlewares y controladores
        req.userFound = userFound;

        next();
    }
    catch ( error ) {
        console.error( error );
        return res.status( 500 ).json({ msg: 'No se pudo verificar la autenticación' });
    }
}

export {
    authMiddleware
}
