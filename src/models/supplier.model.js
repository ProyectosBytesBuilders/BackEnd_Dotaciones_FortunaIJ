import { Schema, model } from 'mongoose';

const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const SupplierSchema = new Schema(
    {
        name: {
            type: String,
            required: [ true, 'El nombre o razón social del proveedor es obligatorio' ],
            unique: true,
            trim: true,
            minlength: [ 2, 'El nombre del proveedor debe tener al menos 2 caracteres' ],
            maxlength: [ 100, 'El nombre del proveedor no puede exceder los 100 caracteres' ]
        },
        nit: {
            type: String,
            trim: true,
            uppercase: true,
            unique: true,
            sparse: true,
            maxlength: [ 25, 'El NIT no puede exceder los 25 caracteres' ]
        },
        contactName: {
            type: String,
            trim: true,
            maxlength: [ 80, 'El nombre de contacto no puede exceder los 80 caracteres' ],
            default: ''
        },
        phone: {
            type: String,
            required: [ true, 'El teléfono de contacto del proveedor es obligatorio' ],
            trim: true,
            minlength: [ 7, 'El teléfono debe tener al menos 7 caracteres' ],
            maxlength: [ 20, 'El teléfono no puede exceder los 20 caracteres' ]
        },
        email: {
            type: String,
            trim: true,
            lowercase: true,
            match: [ emailRegex, 'El correo electrónico del proveedor no tiene un formato válido' ]
        },
        address: {
            type: String,
            trim: true,
            maxlength: [ 150, 'La dirección no puede exceder los 150 caracteres' ],
            default: ''
        },
        // RU-F9: Lista de materiales e insumos que suministra el proveedor
        suppliedMaterials: {
            type: [
                {
                    type: String,
                    trim: true,
                    maxlength: [ 80, 'Cada material suministrado no puede exceder 80 caracteres' ]
                }
            ],
            validate: {
                validator: ( arr ) => Array.isArray( arr ) && arr.length > 0,
                message: 'Debe registrar al menos un material o insumo que provee'
            }
        },
        notes: {
            type: String,
            trim: true,
            maxlength: [ 300, 'Las observaciones no pueden exceder los 300 caracteres' ],
            default: ''
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
        versionKey: false
    }
);

SupplierSchema.index({ status: 1 });

const SupplierModel = model( 'supplier', SupplierSchema );

export default SupplierModel;