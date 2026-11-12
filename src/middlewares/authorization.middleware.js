// AUTORIZACIÓN: ¿tienes permiso? Va SIEMPRE después de authMiddleware.
// Uso:  authorizationMiddleware([ ROLES.GERENTE_GENERAL, ROLES.ADMIN_INVENTARIO ])

const authorizationMiddleware = ( allowedRoles = [] ) => {

    return ( req, res, next ) => {
        const user = req.userFound;

        if ( ! user ) {
            return res.status( 401 ).json({ msg: 'Debe autenticarse primero' });
        }

        if ( ! allowedRoles.includes( user.role ) ) {
            return res.status( 403 ).json({
                msg: `El rol ${ user.role } no está autorizado para realizar esta acción`
            });
        }

        next();
    }

}

export {
    authorizationMiddleware
}
