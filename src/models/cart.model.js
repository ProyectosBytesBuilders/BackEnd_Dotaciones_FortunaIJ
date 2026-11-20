import { Schema, model } from 'mongoose';

// Carrito: uno por cliente. Solo guarda producto y cantidad.
// El precio NO se guarda aquí: siempre se lee del producto, para que nunca quede desactualizado.
const CartItemSchema = new Schema(
    {
        product: {
            type: Schema.Types.ObjectId,
            ref: 'product',
            required: [ true, 'El producto es obligatorio' ]
        },
        quantity: {
            type: Number,
            required: [ true, 'La cantidad es obligatoria' ],
            min: [ 1, 'La cantidad mínima es 1' ],
            validate: {
                validator: Number.isInteger,
                message: 'La cantidad debe ser un número entero'
            }
        }
    },
    { _id: false }
);

const CartSchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: 'user',
            required: true,
            unique: true        // Un solo carrito por usuario
        },
        items: {
            type: [ CartItemSchema ],
            default: []
        }
    },
    { timestamps: true, versionKey: false }
);

const CartModel = model( 'cart', CartSchema );

export default CartModel;
