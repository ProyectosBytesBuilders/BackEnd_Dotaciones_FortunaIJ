import { isValidObjectId } from 'mongoose';
import {
    dbGetCartDetail,
    dbAddItemToCart,
    dbSetItemQuantity,
    dbRemoveItemFromCart,
    dbClearCart
} from '../services/cart.services.js';

// Cantidad válida: entero entre 1 y 100
const isValidQuantity = ( q ) => Number.isInteger( q ) && q >= 1 && q <= 100;

const handleError = ( error, res, fallbackMsg ) => {
    if ( error.status ) return res.status( error.status ).json({ msg: error.message });

    console.error( error );
    return res.status( 500 ).json({ msg: fallbackMsg });
}

// GET /api/cart
const getCart = async ( req, res ) => {
    try {
        const cart = await dbGetCartDetail( req.userFound._id );
        return res.json({ data: cart });
    }
    catch ( error ) {
        return handleError( error, res, 'No se pudo consultar el carrito' );
    }
}

// POST /api/cart/items   body: { productId, quantity }
const addItem = async ( req, res ) => {
    try {
        const { productId, quantity } = req.body ?? {};

        if ( typeof productId !== 'string' || ! isValidObjectId( productId ) ) {
            return res.status( 400 ).json({ msg: 'productId no es un identificador válido' });
        }

        if ( ! isValidQuantity( quantity ) ) {
            return res.status( 400 ).json({ msg: 'quantity debe ser un número entero entre 1 y 100' });
        }

        await dbAddItemToCart( req.userFound._id, productId, quantity );

        return res.status( 201 ).json({
            msg: 'Producto agregado al carrito',
            data: await dbGetCartDetail( req.userFound._id )
        });
    }
    catch ( error ) {
        return handleError( error, res, 'No se pudo agregar el producto al carrito' );
    }
}

// PATCH /api/cart/items/:productId   body: { quantity }
const updateItem = async ( req, res ) => {
    try {
        const { productId } = req.params;
        const { quantity } = req.body ?? {};

        if ( ! isValidObjectId( productId ) ) {
            return res.status( 400 ).json({ msg: 'productId no es un identificador válido' });
        }

        if ( ! isValidQuantity( quantity ) ) {
            return res.status( 400 ).json({ msg: 'quantity debe ser un número entero entre 1 y 100' });
        }

        await dbSetItemQuantity( req.userFound._id, productId, quantity );

        return res.json({
            msg: 'Cantidad actualizada',
            data: await dbGetCartDetail( req.userFound._id )
        });
    }
    catch ( error ) {
        return handleError( error, res, 'No se pudo actualizar el carrito' );
    }
}

// DELETE /api/cart/items/:productId
const removeItem = async ( req, res ) => {
    try {
        const { productId } = req.params;

        if ( ! isValidObjectId( productId ) ) {
            return res.status( 400 ).json({ msg: 'productId no es un identificador válido' });
        }

        await dbRemoveItemFromCart( req.userFound._id, productId );

        return res.json({
            msg: 'Producto eliminado del carrito',
            data: await dbGetCartDetail( req.userFound._id )
        });
    }
    catch ( error ) {
        return handleError( error, res, 'No se pudo eliminar el producto del carrito' );
    }
}

// DELETE /api/cart
const clearCart = async ( req, res ) => {
    try {
        await dbClearCart( req.userFound._id );
        return res.json({ msg: 'Carrito vaciado' });
    }
    catch ( error ) {
        return handleError( error, res, 'No se pudo vaciar el carrito' );
    }
}

export { getCart, addItem, updateItem, removeItem, clearCart }
