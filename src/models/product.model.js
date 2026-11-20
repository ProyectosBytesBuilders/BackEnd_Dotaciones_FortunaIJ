import mongoose, { Schema, model } from 'mongoose';

// ⚠️ MODELO TEMPORAL: el módulo de Inventario (Dilan) es el dueño de este archivo.
// Existe solo para poder probar Pedidos. Cuando Dilan haga merge, se queda SU versión,
// siempre que conserve estos campos: name, price (en pesos), stock y status (true = activo).
const ProductSchema = new Schema(
    {
        name:   { type: String, required: [ true, 'El nombre es obligatorio' ], trim: true },
        price:  { type: Number, required: [ true, 'El precio es obligatorio' ], min: [ 0, 'El precio no puede ser negativo' ] },
        stock:  { type: Number, required: true, min: [ 0, 'El stock no puede ser negativo' ], default: 0 },
        status: { type: Boolean, default: true }
    },
    { timestamps: true, versionKey: false }
);

// "mongoose.models.product ||" evita el error de registrar dos veces el mismo modelo
const ProductModel = mongoose.models.product || model( 'product', ProductSchema );

export default ProductModel;
