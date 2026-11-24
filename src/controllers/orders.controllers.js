import { isValidObjectId } from 'mongoose';
import {
    dbCreateOrderFromCart,
    dbGetOrdersByUser,
    dbGetAllOrders,
    dbGetOrderById,
    dbChangeOrderStatus
} from '../services/orders.services.js';
import handleMongooseError from '../helpers/handle-mongoose-error.helper.js';
import { canAccessResource } from '../helpers/ownership.helpers.js';
import { ROLES } from '../constants/roles.js';
import { ORDER_STATUS, ORDER_STATUS_LIST } from '../constants/order-status.js';

// Roles del personal que gestiona pedidos
const STAFF_ROLES = [ ROLES.GERENTE_GENERAL, ROLES.ADMIN_INVENTARIO ];

const handleError = ( error, res, fallbackMsg ) => {
    if ( error.status ) return res.status( error.status ).json({ msg: error.message });

    const validationErrors = handleMongooseError( error );
    if ( validationErrors ) return res.status( 400 ).json( validationErrors );

    console.error( error );
    return res.status( 500 ).json({ msg: fallbackMsg });
}

const MAX_TEXT = 300;

// Solo se aceptan estos campos del body (así nadie envía total, status, user, etc.)
const pickShippingAddress = ( body = {} ) => {
    const { receiverName, phone, address, city, department, details } = body;
    return { receiverName, phone, address, city, department, details };
}

// POST /api/orders   (CLIENTE)  body: { shippingAddress: {...}, notes? }
const createOrder = async ( req, res ) => {
    try {
        const { shippingAddress, notes } = req.body ?? {};

        if ( ! shippingAddress || typeof shippingAddress !== 'object' || Array.isArray( shippingAddress ) ) {
            return res.status( 400 ).json({ msg: 'El campo shippingAddress es obligatorio' });
        }

        const fields = Object.values( pickShippingAddress( shippingAddress ) );
        if ( fields.some( value => value !== undefined && typeof value !== 'string' ) ) {
            return res.status( 400 ).json({ msg: 'Los datos de envío deben ser texto' });
        }

        if ( notes !== undefined && typeof notes !== 'string' ) {
            return res.status( 400 ).json({ msg: 'notes debe ser texto' });
        }

        const order = await dbCreateOrderFromCart( req.userFound, {
            shippingAddress: pickShippingAddress( shippingAddress ),
            notes
        });

        return res.status( 201 ).json({ msg: 'Pedido creado con éxito', data: order });
    }
    catch ( error ) {
        return handleError( error, res, 'No se pudo crear el pedido' );
    }
}

// GET /api/orders/my   (CLIENTE)
const getMyOrders = async ( req, res ) => {
    try {
        const orders = await dbGetOrdersByUser( req.userFound._id );
        return res.json({ data: orders });
    }
    catch ( error ) {
        return handleError( error, res, 'No se pudieron consultar tus pedidos' );
    }
}

// GET /api/orders?status=ENVIADO&page=1&limit=10   (personal)
const getAllOrders = async ( req, res ) => {
    try {
        const { status } = req.query;
        const page = Number( req.query.page ?? 1 );
        const limit = Number( req.query.limit ?? 10 );

        if ( status !== undefined && ! ORDER_STATUS_LIST.includes( status ) ) {
            return res.status( 400 ).json({ msg: `status debe ser uno de: ${ ORDER_STATUS_LIST.join( ', ' ) }` });
        }

        if ( ! Number.isInteger( page ) || page < 1 || ! Number.isInteger( limit ) || limit < 1 || limit > 50 ) {
            return res.status( 400 ).json({ msg: 'page debe ser entero >= 1 y limit un entero entre 1 y 50' });
        }

        const result = await dbGetAllOrders({ status, page, limit });
        return res.json({ data: result });
    }
    catch ( error ) {
        return handleError( error, res, 'No se pudieron consultar los pedidos' );
    }
}

// GET /api/orders/:id   (dueño del pedido o personal)
const getOrderById = async ( req, res ) => {
    try {
        const { id } = req.params;

        if ( ! isValidObjectId( id ) ) return res.status( 400 ).json({ msg: 'El id del pedido no es válido' });

        const order = await dbGetOrderById( id );

        if ( ! order ) return res.status( 404 ).json({ msg: 'Pedido no encontrado' });

        // order.user viene populado: se compara contra su _id (si el usuario ya no existiera, queda el id guardado)
        if ( ! canAccessResource( req.userFound, order.user?._id ?? order.user, STAFF_ROLES ) ) {
            return res.status( 403 ).json({ msg: 'No tienes permiso sobre este pedido' });
        }

        return res.json({ data: order });
    }
    catch ( error ) {
        return handleError( error, res, 'No se pudo consultar el pedido' );
    }
}

// PATCH /api/orders/:id/status   (personal)
// body: { status, note?, carrier?, trackingNumber? }
const changeStatus = async ( req, res ) => {
    try {
        const { id } = req.params;
        const { status, note, carrier, trackingNumber } = req.body ?? {};

        if ( ! isValidObjectId( id ) ) return res.status( 400 ).json({ msg: 'El id del pedido no es válido' });

        if ( ! ORDER_STATUS_LIST.includes( status ) ) {
            return res.status( 400 ).json({ msg: `status debe ser uno de: ${ ORDER_STATUS_LIST.join( ', ' ) }` });
        }

        if ( [ note, carrier, trackingNumber ].some( v => v !== undefined && typeof v !== 'string' ) ) {
            return res.status( 400 ).json({ msg: 'note, carrier y trackingNumber deben ser texto' });
        }

        if ( [ note, carrier, trackingNumber ].some( v => v !== undefined && v.length > MAX_TEXT ) ) {
            return res.status( 400 ).json({ msg: `note, carrier y trackingNumber no pueden exceder ${ MAX_TEXT } caracteres` });
        }

        // Reglas según el estado destino
        if ( status === ORDER_STATUS.ENVIADO && ( ! carrier?.trim() || ! trackingNumber?.trim() ) ) {
            return res.status( 400 ).json({ msg: 'Para marcar como ENVIADO se requiere carrier (transportadora) y trackingNumber (guía)' });
        }

        if ( status === ORDER_STATUS.CANCELADO && ! note?.trim() ) {
            return res.status( 400 ).json({ msg: 'Para cancelar se requiere el motivo en note' });
        }

        const order = await dbChangeOrderStatus( id, status, req.userFound._id, {
            note: note?.trim(),
            carrier: carrier?.trim(),
            trackingNumber: trackingNumber?.trim()
        });

        return res.json({ msg: `Pedido actualizado a ${ order.status }`, data: order });
    }
    catch ( error ) {
        return handleError( error, res, 'No se pudo cambiar el estado del pedido' );
    }
}

// PATCH /api/orders/:id/cancel   (CLIENTE dueño, solo si sigue PENDIENTE)
// body: { reason }
const cancelMyOrder = async ( req, res ) => {
    try {
        const { id } = req.params;
        const { reason } = req.body ?? {};

        if ( ! isValidObjectId( id ) ) return res.status( 400 ).json({ msg: 'El id del pedido no es válido' });

        if ( typeof reason !== 'string' || ! reason.trim() ) {
            return res.status( 400 ).json({ msg: 'El motivo de la cancelación (reason) es obligatorio' });
        }

        if ( reason.length > MAX_TEXT ) {
            return res.status( 400 ).json({ msg: `reason no puede exceder ${ MAX_TEXT } caracteres` });
        }

        const order = await dbGetOrderById( id );

        // Mismo mensaje si no existe o no es suyo: no se revela qué pedidos existen
        if ( ! order || String( order.user?._id ?? order.user ) !== String( req.userFound._id ) ) {
            return res.status( 404 ).json({ msg: 'Pedido no encontrado' });
        }

        if ( order.status !== ORDER_STATUS.PENDIENTE ) {
            return res.status( 400 ).json({ msg: 'Solo puedes cancelar pedidos PENDIENTES. Comunícate con la empresa (PQRS)' });
        }

        const cancelled = await dbChangeOrderStatus( id, ORDER_STATUS.CANCELADO, req.userFound._id, {
            note: reason.trim(),
            onlyFrom: ORDER_STATUS.PENDIENTE      // Si el personal lo confirmó justo ahora, ya no se cancela
        });

        return res.json({ msg: 'Pedido cancelado', data: cancelled });
    }
    catch ( error ) {
        return handleError( error, res, 'No se pudo cancelar el pedido' );
    }
}

export { createOrder, getMyOrders, getAllOrders, getOrderById, changeStatus, cancelMyOrder }
