import { Schema, model } from 'mongoose';
import {
    PRODUCT_CATEGORIES_LIST,
    UNIT_TYPES,
    UNIT_TYPES_LIST,
    STOCK_ALERT_LEVELS
} from '../constants/inventory.constants.js';

const ProductSchema = new Schema(
    {
        code: {
            type: String,
            required: [ true, 'El código del material o dotación es obligatorio' ],
            unique: true,
            trim: true,
            uppercase: true,
            minlength: [ 2, 'El código debe tener al menos 2 caracteres' ],
            maxlength: [ 30, 'El código no puede exceder los 30 caracteres' ]
        },
        name: {
            type: String,
            required: [ true, 'El nombre del material o dotación es obligatorio' ],
            trim: true,
            minlength: [ 2, 'El nombre debe tener al menos 2 caracteres' ],
            maxlength: [ 100, 'El nombre no puede exceder los 100 caracteres' ]
        },
        description: {
            type: String,
            trim: true,
            maxlength: [ 400, 'La descripción no puede exceder los 400 caracteres' ],
            default: ''
        },
        category: {
            type: String,
            required: [ true, 'La categoría es obligatoria' ],
            enum: {
                values: PRODUCT_CATEGORIES_LIST,
                message: `La categoría {VALUE} no es válida. Debe ser: ${ PRODUCT_CATEGORIES_LIST.join( ', ' ) }`
            }
        },
        material: {
            type: String,
            required: [ true, 'El tipo de material o composición es obligatorio' ],
            trim: true,
            minlength: [ 2, 'El material debe tener al menos 2 caracteres' ],
            maxlength: [ 80, 'El material no puede exceder los 80 caracteres' ]
        },
        color: {
            type: String,
            required: [ true, 'El color es obligatorio' ],
            trim: true,
            minlength: [ 2, 'El color debe tener al menos 2 caracteres' ],
            maxlength: [ 50, 'El color no puede exceder los 50 caracteres' ]
        },
        size: {
            type: String,
            trim: true,
            uppercase: true,
            maxlength: [ 20, 'La talla no puede exceder los 20 caracteres' ],
            default: 'N/A'
        },
        unit: {
            type: String,
            enum: {
                values: UNIT_TYPES_LIST,
                message: `La unidad {VALUE} no es válida. Debe ser: ${ UNIT_TYPES_LIST.join( ', ' ) }`
            },
            default: UNIT_TYPES.UNIDAD
        },
        stock: {
            type: Number,
            required: [ true, 'La cantidad en stock es obligatoria' ],
            default: 0,
            min: [ 0, 'El stock no puede ser negativo' ]
        },
        // RE-F7: Nivel mínimo de inventario para generar alertas
        minStock: {
            type: Number,
            required: [ true, 'El nivel mínimo de inventario es obligatorio' ],
            default: 5,
            min: [ 0, 'El stock mínimo no puede ser negativo' ]
        },
        unitPrice: {
            type: Number,
            default: 0,
            min: [ 0, 'El precio unitario no puede ser negativo' ]
        },
        location: {
            type: String,
            trim: true,
            maxlength: [ 80, 'La ubicación en bodega no puede exceder los 80 caracteres' ],
            default: 'Bodega Principal'
        },
        supplier: {
            type: Schema.Types.ObjectId,
            ref: 'supplier',
            default: null
        },
        // RU-F3: Fecha en la cual se realizó la última entrada de este material
        lastEntryAt: {
            type: Date,
            default: null
        },
        status: {
            type: Boolean,
            default: true
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'user',
            required: true
        },
        updatedBy: {
            type: Schema.Types.ObjectId,
            ref: 'user',
            default: null
        }
    },
    {
        timestamps: true,
        versionKey: false,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

// Campo calculado para el FrontEnd: estado visual del nivel de existencias
ProductSchema.virtual( 'stockStatus' ).get( function () {
    if ( this.stock === 0 ) return STOCK_ALERT_LEVELS.AGOTADO;
    if ( this.stock <= this.minStock ) return STOCK_ALERT_LEVELS.STOCK_BAJO;
    return STOCK_ALERT_LEVELS.NORMAL;
});

ProductSchema.virtual( 'isLowStock' ).get( function () {
    return this.stock <= this.minStock;
});

// Índices para acelerar búsquedas y filtros (RNF5 / RU-NF4 / RE-NF5)
ProductSchema.index({ name: 1 });
ProductSchema.index({ category: 1 });
ProductSchema.index({ status: 1 });
ProductSchema.index({ stock: 1, minStock: 1 });

const ProductModel = model( 'product', ProductSchema );

export default ProductModel;