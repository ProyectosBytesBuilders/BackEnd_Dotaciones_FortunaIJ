import { generatePassword, verifyPassword } from '../helpers/bcrypt.helpers.js';
import { generateToken } from '../helpers/jwt.helpers.js';
import { passwordRegex, PASSWORD_MESSAGE } from '../helpers/validators.helpers.js';
import handleMongooseError from '../helpers/handle-mongoose-error.helper.js';
import { dbCreateUser, dbGetUserByEmail } from '../services/users.services.js';
import { ROLES } from '../constants/roles.js';

// Datos que viajan dentro del token (nada sensible)
const buildPayload = ( user ) => ({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role
});

// POST /api/auth/register  -> Registro público: SIEMPRE crea un CLIENTE
const registerUser = async ( req, res ) => {
    try {
        // Se toman solo estos 3 campos: así nadie puede enviar role, status o createdBy
        const { name, email, password } = req.body ?? {};

        if ( ! name || ! email || ! password ) {
            return res.status( 400 ).json({ msg: 'Los campos name, email y password son obligatorios' });
        }

        // Evita inyección NoSQL (ej: "email": { "$ne": null })
        if ( [ name, email, password ].some( value => typeof value !== 'string' ) ) {
            return res.status( 400 ).json({ msg: 'Los campos name, email y password deben ser texto' });
        }

        if ( ! passwordRegex.test( password ) ) {
            return res.status( 400 ).json({ password: PASSWORD_MESSAGE });
        }

        const hashPassword = await generatePassword( password );

        // RF- : Usuario Admin unico 
        const newUser = await dbCreateUser({
            name,
            email,
            password: hashPassword,
            role: ROLES.CLIENTE
        });

        // Se genera token para que el cliente quede con sesión iniciada al registrarse
        const token = generateToken( buildPayload( newUser ) );

        return res.status( 201 ).json({
            msg: 'Usuario registrado con éxito',
            token,
            data: newUser       // El toJSON del modelo elimina el password
        });
    }
    catch ( error ) {
        const validationErrors = handleMongooseError( error );

        if ( validationErrors ) {
            return res.status( 400 ).json( validationErrors );
        }

        console.error( error );
        return res.status( 500 ).json({ msg: 'No se pudo registrar el usuario' });
    }
}

// POST /api/auth/login
const loginUser = async ( req, res ) => {
    try {
        const { email, password } = req.body ?? {};

        if ( ! email || ! password ) {
            return res.status( 400 ).json({ msg: 'Los campos email y password son obligatorios' });
        }

        if ( typeof email !== 'string' || typeof password !== 'string' ) {
            return res.status( 400 ).json({ msg: 'Los campos email y password deben ser texto' });
        }

        const userFound = await dbGetUserByEmail( email.trim().toLowerCase(), { withPassword: true } );

        // Mismo mensaje si el correo no existe o la contraseña es incorrecta:
        // así no se revela qué correos están registrados.
        const isValid = userFound
            ? await verifyPassword( password, userFound.password )
            : false;

        if ( ! isValid ) {
            return res.status( 401 ).json({ msg: 'Credenciales inválidas' });
        }

        const token = generateToken( buildPayload( userFound ) );

        return res.json({
            msg: 'Inicio de sesión exitoso',
            token,
            data: userFound     // El toJSON del modelo elimina el password
        });
    }
    catch ( error ) {
        console.error( error );
        return res.status( 500 ).json({ msg: 'No se pudo iniciar sesión' });
    }
}

// GET /api/auth/renew-token  -> (requiere authMiddleware) devuelve un token nuevo y los datos del usuario
const renewToken = ( req, res ) => {
    const userFound = req.userFound;        // Lo dejó authMiddleware

    return res.json({
        msg: 'Sesión válida',
        token: generateToken( buildPayload( userFound ) ),
        data: userFound
    });
}

export {
    registerUser,
    loginUser,
    renewToken
}
