import { ROLES } from '../constants/roles.js';

/**
 * Para recursos con dueño (pedidos, PQRS): ¿puede este usuario acceder?
 * Sí, si es el dueño del recurso o si tiene alguno de los roles indicados.
 *
 * Uso en un controlador:
 *   const order = await dbGetOrder( req.params.id );
 *   if( ! canAccessResource( req.userFound, order.user ) ) {
 *       return res.status( 403 ).json({ msg: 'No tienes permiso sobre este recurso' });
 *   }
 *
 * @param {Object} user      Usuario autenticado (req.userFound)
 * @param {*}      ownerId   Id del dueño del recurso (ObjectId o string)
 * @param {string[]} roles   Roles que pueden acceder aunque no sean dueños
 */
const canAccessResource = ( user, ownerId, roles = [ ROLES.GERENTE_GENERAL ] ) => {
    const isOwner = String( user._id ) === String( ownerId );
    const hasRole = roles.includes( user.role );

    return isOwner || hasRole;
}

export { canAccessResource };
