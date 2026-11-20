import { Schema, model } from 'mongoose';

// Parte 1: Definir la estructura del documento de PQRS
const PqrsSchema = new Schema(
    {
        tipo: {
            type: String,
            required: [true, 'El tipo de PQRS es obligatorio'],
            enum: {
                values: ['peticion', 'queja', 'reclamo', 'sugerencia'],
                message: 'El tipo debe ser peticion, queja, reclamo o sugerencia'
            },
            trim: true,
            lowercase: true
        },

        descripcion: {
            type: String,
            required: [true, 'La descripción de la PQRS es obligatoria'],
            trim: true,
            minlength: [10, 'La descripción debe tener al menos 10 caracteres']
        },

        archivo_adjunto: {
            type: String,
            default: null,
            trim: true
        },

        fecha: {
            type: Date,
            default: Date.now
        },

        estado: {
            type: String,
            enum: {
                values: ['abierto', 'en_revision', 'resuelto', 'cerrado'],
                message: 'El estado debe ser abierto, en_revision, resuelto o cerrado'
            },
            default: 'abierto',
            trim: true,
            lowercase: true
        },

        anonimo: {
            type: Boolean,
            default: false
        },

        id_cliente: {
            type: Number,
            default: null,
            min: [1, 'El ID del cliente debe ser mayor que cero'],
            validate: {
                validator: (value) => value === null || Number.isInteger(value),
                message: 'El ID del cliente debe ser un número entero'
            }
        }
    },
    {
        timestamps: true,
        versionKey: false
    }
);

// Parte 2: Crear el modelo asociado a la colección pqrs
const PqrsModel = model('Pqrs', PqrsSchema, 'pqrs');

export default PqrsModel;
