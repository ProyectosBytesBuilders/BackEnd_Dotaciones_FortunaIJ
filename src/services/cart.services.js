import CartModel from '../models/cart.model.js';
import ProductModel from '../models/product.model.js';
import HttpError from '../helpers/http-error.helper.js';

// Devuelve el carrito del usuario (lo crea vacío si no existe)
const dbGetOrCreateCart = async ( userId ) => {
    const cart = await CartModel.findOne({ user: userId });
    if ( cart ) return cart;

    try {
        return await CartModel.create({ user: userId, items: [] });
    }
    catch ( error ) {
        // Dos peticiones simultáneas intentaron crearlo: el índice único frena a la segunda, se usa el que ya existe
        if ( error.code === 11000 ) return await CartModel.findOne({ user: userId });
        throw error;
    }
}

// Carrito listo para mostrar: con nombre y precio actuales y los totales calculados
const dbGetCartDetail = async ( userId ) => {
    const cart = await dbGetOrCreateCart( userId );
    await cart.populate( 'items.product', 'name price stock status' );

    let total = 0;
    const items = [];

    for ( const item of cart.items ) {
        const product = item.product;

        // Producto borrado o desactivado por el inventario: se avisa, no se cobra
        const available = !! product && product.status === true;
        const subtotal = available ? product.price * item.quantity : 0;
        total += subtotal;

        items.push({
            product: product?._id ?? null,
            name: product?.name ?? 'Producto no disponible',
            price: product?.price ?? 0,
            quantity: item.quantity,
            subtotal,
            stock: product?.stock ?? 0,
            available: available && product.stock >= item.quantity
        });
    }

    return { _id: cart._id, items, total };
}

// Agrega un producto (o suma cantidad si ya estaba). Valida existencia y stock.
const dbAddItemToCart = async ( userId, productId, quantity ) => {
    const product = await ProductModel.findOne({ _id: productId, status: true });

    if ( ! product ) throw new HttpError( 404, 'El producto no existe o no está disponible' );

    const cart = await dbGetOrCreateCart( userId );
    const existing = cart.items.find( item => String( item.product ) === String( productId ) );
    const newQuantity = ( existing?.quantity ?? 0 ) + quantity;

    if ( newQuantity > product.stock ) {
        throw new HttpError( 400, `Stock insuficiente de '${ product.name }'. Disponible: ${ product.stock }` );
    }

    if ( existing ) existing.quantity = newQuantity;
    else cart.items.push({ product: productId, quantity });

    await cart.save();
}

// Cambia la cantidad de un producto que ya está en el carrito
const dbSetItemQuantity = async ( userId, productId, quantity ) => {
    const cart = await dbGetOrCreateCart( userId );
    const existing = cart.items.find( item => String( item.product ) === String( productId ) );

    if ( ! existing ) throw new HttpError( 404, 'El producto no está en el carrito' );

    const product = await ProductModel.findOne({ _id: productId, status: true });

    if ( ! product ) throw new HttpError( 404, 'El producto ya no está disponible' );

    if ( quantity > product.stock ) {
        throw new HttpError( 400, `Stock insuficiente de '${ product.name }'. Disponible: ${ product.stock }` );
    }

    existing.quantity = quantity;
    await cart.save();
}

const dbRemoveItemFromCart = async ( userId, productId ) => {
    const result = await CartModel.updateOne(
        { user: userId },
        { $pull: { items: { product: productId } } }
    );

    if ( result.modifiedCount === 0 ) throw new HttpError( 404, 'El producto no está en el carrito' );
}

const dbClearCart = async ( userId ) => {
    await CartModel.updateOne({ user: userId }, { $set: { items: [] } });
}

export {
    dbGetOrCreateCart,
    dbGetCartDetail,
    dbAddItemToCart,
    dbSetItemQuantity,
    dbRemoveItemFromCart,
    dbClearCart
}
