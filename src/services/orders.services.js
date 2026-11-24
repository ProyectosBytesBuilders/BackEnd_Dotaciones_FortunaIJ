import { randomBytes } from 'node:crypto';
import OrderModel from '../models/order.model.js';
import ProductModel from '../models/product.model.js';
import CartModel from '../models/cart.model.js';
import HttpError from '../helpers/http-error.helper.js';
import { ORDER_STATUS, ORDER_TRANSITIONS } from '../constants/order-status.js';

// Número legible del pedido. Ej: PED-20261113-4F9K2A
const generateOrderNumber = () => {
    const date = new Date().toISOString().slice( 0, 10 ).replaceAll( '-', '' );
    const code = randomBytes( 4 ).toString( 'hex' ).toUpperCase().slice( 0, 6 );

    return `PED-${ date }-${ code }`;
}

// Devuelve al inventario las unidades [{ product, quantity }].
// Si una falla, se registra y se sigue con las demás: así una sola falla no deja el resto sin devolver.
const restoreStock = async ( items, orderNumber = '' ) => {
    for ( const item of items ) {
        try {
            await ProductModel.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } });
        }
        catch ( error ) {
            console.error( `No se pudo devolver el stock (pedido ${ orderNumber }, producto ${ item.product }, cantidad ${ item.quantity })`, error );
        }
    }
}

// ───────────── CREAR PEDIDO (checkout) ─────────────
// Convierte el carrito en un pedido PENDIENTE y descuenta el stock.
const dbCreateOrderFromCart = async ( user, { shippingAddress, notes } ) => {
    const cart = await CartModel.findOne({ user: user._id });

    if ( ! cart || cart.items.length === 0 ) throw new HttpError( 400, 'El carrito está vacío' );

    // 1. Foto de los productos con el precio ACTUAL (el cliente nunca envía precios)
    const products = await ProductModel.find({ _id: { $in: cart.items.map( i => i.product ) }, status: true });
    const productsMap = new Map( products.map( p => [ String( p._id ), p ] ) );

    const orderItems = cart.items.map( ( item ) => {
        const product = productsMap.get( String( item.product ) );

        if ( ! product ) throw new HttpError( 400, 'Hay productos en el carrito que ya no están disponibles. Retíralos e intenta de nuevo' );

        return {
            product: product._id,
            name: product.name,
            price: product.price,
            quantity: item.quantity,
            subtotal: product.price * item.quantity
        };
    });

    // 2. Descontar stock. Cada descuento es atómico: solo ocurre si todavía hay unidades,
    //    así dos clientes comprando a la vez nunca dejan el stock en negativo.
    const reserved = [];

    try {
        for ( const item of orderItems ) {
            const updated = await ProductModel.findOneAndUpdate(
                { _id: item.product, status: true, stock: { $gte: item.quantity } },
                { $inc: { stock: -item.quantity } }
            );

            if ( ! updated ) throw new HttpError( 400, `Stock insuficiente de '${ item.name }'` );

            reserved.push( item );
        }

        // 3. Crear el pedido (si el número generado ya existe, que es casi imposible, se reintenta)
        let order;

        for ( let attempt = 1; attempt <= 3; attempt++ ) {
            try {
                order = await OrderModel.create({
                    orderNumber: generateOrderNumber(),
                    user: user._id,
                    items: orderItems,
                    shippingAddress,
                    notes,
                    total: orderItems.reduce( ( sum, item ) => sum + item.subtotal, 0 ),
                    statusHistory: [{ status: ORDER_STATUS.PENDIENTE, changedBy: user._id, note: 'Pedido creado' }]
                });
                break;
            }
            catch ( error ) {
                const isDuplicateNumber = error.code === 11000 && error.keyPattern?.orderNumber;
                if ( ! isDuplicateNumber || attempt === 3 ) throw error;
            }
        }

        // 4. Vaciar el carrito (ya es un pedido)
        await CartModel.updateOne({ user: user._id }, { $set: { items: [] } });

        return order;
    }
    catch ( error ) {
        // Si algo falló, lo descontado vuelve al inventario
        await restoreStock( reserved, '(checkout fallido)' );
        throw error;
    }
}

// ───────────── CONSULTAS ─────────────
const dbGetOrdersByUser = async ( userId ) => {
    return await OrderModel.find({ user: userId }).sort({ createdAt: -1 });
}

// Listado general para el personal, con filtro por estado y paginación
const dbGetAllOrders = async ({ status, page = 1, limit = 10 } = {}) => {
    const filter = status ? { status } : {};

    const [ orders, total ] = await Promise.all([
        OrderModel.find( filter )
            .sort({ createdAt: -1 })
            .skip( ( page - 1 ) * limit )
            .limit( limit )
            .populate( 'user', 'name email' ),
        OrderModel.countDocuments( filter )
    ]);

    return { orders, total, page, pages: Math.ceil( total / limit ) };
}

const dbGetOrderById = async ( id ) => {
    return await OrderModel.findById( id ).populate( 'user', 'name email' );
}

// ───────────── CAMBIO DE ESTADO ─────────────
// extra: { note, carrier, trackingNumber }
const dbChangeOrderStatus = async ( orderId, newStatus, changedBy, extra = {} ) => {
    const order = await OrderModel.findById( orderId );

    if ( ! order ) throw new HttpError( 404, 'Pedido no encontrado' );

    // Opcional: exigir que el pedido siga en un estado concreto (lo usa el cliente al cancelar,
    // para no cancelar un pedido que el personal acaba de confirmar)
    if ( extra.onlyFrom && order.status !== extra.onlyFrom ) {
        throw new HttpError( 409, `El pedido ya no está ${ extra.onlyFrom }, ahora está ${ order.status }` );
    }

    const allowed = ORDER_TRANSITIONS[ order.status ];

    if ( ! allowed.includes( newStatus ) ) {
        const detail = allowed.length
            ? `Desde ${ order.status } solo se puede pasar a: ${ allowed.join( ', ' ) }`
            : `El pedido está ${ order.status } y ya no admite más cambios`;

        throw new HttpError( 400, `No se puede pasar de ${ order.status } a ${ newStatus }. ${ detail }` );
    }

    const now = new Date();
    const changes = { status: newStatus };

    if ( newStatus === ORDER_STATUS.ENVIADO ) {
        changes[ 'shipping.carrier' ] = extra.carrier;
        changes[ 'shipping.trackingNumber' ] = extra.trackingNumber;
        changes[ 'shipping.shippedAt' ] = now;
    }

    if ( newStatus === ORDER_STATUS.ENTREGADO ) changes.deliveredAt = now;

    if ( newStatus === ORDER_STATUS.CANCELADO ) {
        changes.cancelReason = extra.note;
        changes.cancelledAt = now;
    }

    // Se filtra también por el estado actual: si otra persona lo cambió en el mismo instante,
    // este cambio no se aplica (evita saltarse la máquina de estados por concurrencia).
    const updated = await OrderModel.findOneAndUpdate(
        { _id: orderId, status: order.status },
        {
            $set: changes,
            $push: { statusHistory: { status: newStatus, changedBy, note: extra.note ?? '', date: now } }
        },
        { returnDocument: 'after', runValidators: true }
    );

    if ( ! updated ) throw new HttpError( 409, 'El pedido cambió de estado mientras lo procesabas. Vuelve a consultarlo' );

    // Cancelar devuelve las unidades al inventario
    if ( newStatus === ORDER_STATUS.CANCELADO ) await restoreStock( updated.items, updated.orderNumber );

    return updated;
}

export {
    dbCreateOrderFromCart,
    dbGetOrdersByUser,
    dbGetAllOrders,
    dbGetOrderById,
    dbChangeOrderStatus
}
