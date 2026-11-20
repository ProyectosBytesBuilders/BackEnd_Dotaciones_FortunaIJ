import { Schema, model } from 'mongoose';
import { ORDER_STATUS, ORDER_STATUS_LIST } from '../constants/order-status.js';

// Cada producto del pedido es una FOTO del momento de la compra:
// si mañana cambia el precio o el nombre del producto, el pedido NO se altera.
const OrderItemSchema = new Schema(
    {
        product:  { type: Schema.Types.ObjectId, ref: 'product', required: true },
        name:     { type: String, required: true },
        price:    { type: Number, required: true, min: 0 },      // Precio unitario al comprar
        quantity: { type: Number, required: true, min: 1 },
        subtotal: { type: Number, required: true, min: 0 }       // price * quantity
    },
    { _id: false }
);

// Datos de envío (los pide el checkout)
const ShippingAddressSchema = new Schema(
    {
        receiverName: { type: String, required: [ true, 'El nombre de quien recibe es obligatorio' ], trim: true, maxlength: 80 },
        phone:        { type: String, required: [ true, 'El teléfono es obligatorio' ], trim: true, match: [ /^\+?\d{7,15}$/, 'El teléfono debe tener entre 7 y 15 dígitos' ] },
        address:      { type: String, required: [ true, 'La dirección es obligatoria' ], trim: true, maxlength: 150 },
        city:         { type: String, required: [ true, 'La ciudad es obligatoria' ], trim: true, maxlength: 60 },
        department:   { type: String, required: [ true, 'El departamento es obligatorio' ], trim: true, maxlength: 60 },
        details:      { type: String, trim: true, maxlength: 150, default: '' }   // Apto, barrio, referencias
    },
    { _id: false }
);

// Cada cambio de estado deja un registro (quién, cuándo, de qué a qué)
const StatusHistorySchema = new Schema(
    {
        status:    { type: String, enum: ORDER_STATUS_LIST, required: true },
        changedBy: { type: Schema.Types.ObjectId, ref: 'user', required: true },
        note:      { type: String, trim: true, default: '' },
        date:      { type: Date, default: Date.now }
    },
    { _id: false }
);

const OrderSchema = new Schema(
    {
        orderNumber: { type: String, unique: true, required: true },   // Ej: PED-20261113-4F9K2
        user:        { type: Schema.Types.ObjectId, ref: 'user', required: true, index: true },
        items: {
            type: [ OrderItemSchema ],
            validate: { validator: ( items ) => items.length > 0, message: 'El pedido debe tener al menos un producto' }
        },
        shippingAddress: { type: ShippingAddressSchema, required: [ true, 'Los datos de envío son obligatorios' ] },
        notes:           { type: String, trim: true, maxlength: 300, default: '' },
        total:           { type: Number, required: true, min: 0 },

        status: {
            type: String,
            enum: { values: ORDER_STATUS_LIST, message: 'El estado {VALUE} no es válido' },
            default: ORDER_STATUS.PENDIENTE,
            index: true
        },
        statusHistory: { type: [ StatusHistorySchema ], default: [] },

        // Se llenan al pasar a ENVIADO
        shipping: {
            carrier:        { type: String, trim: true },       // Transportadora
            trackingNumber: { type: String, trim: true },       // Número de guía
            shippedAt:      { type: Date }
        },
        deliveredAt:  { type: Date },

        // Se llenan al CANCELAR
        cancelReason: { type: String, trim: true },
        cancelledAt:  { type: Date }
    },
    { timestamps: true, versionKey: false }
);

const OrderModel = model( 'order', OrderSchema );

export default OrderModel;
