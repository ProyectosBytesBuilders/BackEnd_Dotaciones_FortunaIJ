import { Schema, model } from 'mongoose';
import { MOVEMENT_TYPES_LIST } from '../constants/inventory.constants.js';

const InventoryMovementSchema = new Schema(
    {
        product: {
            type: Schema.Types.ObjectId,
            ref: 'product',
            required: [ true, 'El material o producto asociado es obligatorio' ]
        },
        type: {
            type: String,
            required: [ true, 'El tipo de movimiento es obligatorio' ],
            enum: {
                values: MOVEMENT_TYPES_LIST,
                message: `El tipo de movimiento {VALUE} no es válido. Debe ser: ${ MOVEMENT_TYPES_LIST.join( ', ' ) }`
            }
        },
        quantity: {
            type: Number,
            required: [ true, 'La cantidad del movimiento es obligatoria' ],
            min: [ 1, 'La cantidad del movimiento debe ser mayor o igual a 1' ]
        },
        previousStock: {
            type: Number,
            required: true,
            min: [ 0, 'El stock anterior no puede ser negativo' ]
        },
        newStock: {
            type: Number,
            required: true,
            min: [ 0, 'El stock resultante no puede ser negativo' ]
        },
        unitCost: {
            type: Number,
            default: 0,
            min: [ 0, 'El costo unitario no puede ser negativo' ]
        },
        supplier: {
            type: Schema.Types.ObjectId,
            ref: 'supplier',
            default: null
        },
        // RU-F14: Color específico utilizado en producción / elaboración de dotaciones
        colorUsed: {
            type: String,
            trim: true,
            maxlength: [ 50, 'El color usado no puede exceder los 50 caracteres' ],
            default: null
        },
        // RU-F14 / RU-F15: Orden de producción o código de pedido vinculado
        productionOrder: {
            type: String,
            trim: true,
            uppercase: true,
            maxlength: [ 50, 'La orden de producción no puede exceder los 50 caracteres' ],
            default: null
        },
        referenceDocument: {
            type: String,
            trim: true,
            maxlength: [ 80, 'El documento de referencia no puede exceder los 80 caracteres' ],
            default: ''
        },
        reason: {
            type: String,
            required: [ true, 'El motivo u observación del movimiento es obligatorio' ],
            trim: true,
            minlength: [ 3, 'El motivo debe tener al menos 3 caracteres' ],
            maxlength: [ 250, 'El motivo no puede exceder los 250 caracteres' ]
        },
        // Auditoría: Gerente General o Administrador de Inventario que realizó el registro
        performedBy: {
            type: Schema.Types.ObjectId,
            ref: 'user',
            required: true
        }
    },
    {
        timestamps: true,
        versionKey: false
    }
);

InventoryMovementSchema.index({ product: 1, createdAt: -1 });
InventoryMovementSchema.index({ type: 1, createdAt: -1 });
InventoryMovementSchema.index({ performedBy: 1 });

const InventoryMovementModel = model( 'inventory_movement', InventoryMovementSchema );

export default InventoryMovementModel;