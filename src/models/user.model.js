import { Schema, model } from 'mongoose';
import { ROLES, ROLES_LIST } from '../constants/roles.js';

// Formato de correo: usuario@dominio.ext
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const UserSchema = new Schema(
    {
        name: {
            type: String,
            required: [ true, 'El nombre es obligatorio' ],
            trim: true,
            minlength: [ 3, 'El nombre debe tener al menos 3 caracteres' ],
            maxlength: [ 50, 'El nombre no puede exceder los 50 caracteres' ]
        },
        email: {
            type: String,
            required: [ true, 'El correo electrónico es obligatorio' ],
            unique: true,
            trim: true,
            lowercase: true,
            match: [ emailRegex, 'El correo electrónico no tiene un formato válido' ]
        },
        // Aquí se guarda el HASH (bcrypt), nunca la contraseña original.
        // select: false => no sale en las consultas a menos que se pida con .select('+password')
        password: {
            type: String,
            required: [ true, 'La contraseña es obligatoria' ],
            select: false
        },
        role: {
            type: String,
            enum: {
                values: ROLES_LIST,
                message: `El rol {VALUE} no es válido, debe ser: ${ ROLES_LIST.join( ', ' ) }`
            },
            default: ROLES.CLIENTE
        },
        status: {
            type: Boolean,
            default: true
        },
        // null: se registró solo. ObjectId: lo creó un Gerente General.
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'user',
            default: null
        }
    },
    {
        timestamps: true,
        versionKey: false,
        // Seguro extra: aunque algún día se devuelva el documento completo, el password nunca viaja en el JSON
        toJSON: {
            transform: ( doc, ret ) => {
                delete ret.password;
                return ret;
            }
        }
    }
);

const UserModel = model( 'user', UserSchema );

export default UserModel;
