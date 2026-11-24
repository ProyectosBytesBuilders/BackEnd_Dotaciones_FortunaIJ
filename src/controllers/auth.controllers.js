import { generatePassword, verifyPassword } from '../helpers/bcrypt.helpers.js';
import { generateToken } from '../helpers/jwt.helpers.js';
import { passwordRegex, PASSWORD_MESSAGE } from '../helpers/validators.helpers.js';
import handleMongooseError from '../helpers/handle-mongoose-error.helper.js';
import { dbCreateUser, dbGetUserByEmail,dbDeleteUserById } from '../services/users.services.js';
import { ROLES } from '../constants/roles.js';

// Datos que viajan dentro del token (nada sensible)
const buildPayload = ( user ) => ({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role
});



// POST /api/auth/register  -> Registro publico: SIEMPRE crea un CLIENTE
const registerUser = async ( req, res ) => {
    try {
        // Se toman solo estos 3 campos: asi nadie puede enviar role, status o createdBy
        const { name, email, password, documentType, documentNumber } = req.body ?? {};
       for(const [field,value] of Object.entries({name, documentType,documentNumber,email,password}) ){
        if(value === undefined || value === null || value === ''){
            return res.status(404).json ({msg :`El campo ${field} es obligatorio`});

        }
        if (typeof value !== 'string'){
            return res.status(404).json({msg:`El campo ${field} debe ser texto`})
        }

       } 
       

        if ( ! passwordRegex.test( password ) ) {
            return res.status( 400 ).json({ password: PASSWORD_MESSAGE });
        }

        const hashPassword = await generatePassword( password );

        // RF- : Usuario Admin unico 
        const newUser = await dbCreateUser({
            name,
            email,
            documentType,
            documentNumber,
            password: hashPassword,
            role: ROLES.CLIENTE
        });

        // Se genera token para que el cliente quede con sesion iniciada al registrarse
        const token = generateToken( buildPayload( newUser ) );

        return res.status( 201 ).json({
            msg: 'Usuario registrado con exito',
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

        // Object.entries({ email, password }) ---> { email, password }  ---> [ [ 'email', 'password' ], [ 'loquesea@correo.co', '12334566' ] ]
        for ( const [ field, value ] of Object.entries({ email, password }) ) {
           
            if ( value === undefined || value === null || value === '' ) {
                return res.status( 400 ).json({ msg: `El campo ${ field } es obligatorio` });
            }

            if ( typeof value !== 'string' ) {
                return res.status( 400 ).json({ msg: `El campo ${ field } debe ser texto` });
            }
        }

       

      
        const userFound = await dbGetUserByEmail( email.trim().toLowerCase(), { withPassword: true } );

        // Mismo mensaje si el correo no existe o la contraseña es incorrecta:
        // asi no se revela que correos estan registrados.
        const isValid = userFound
            ? await verifyPassword( password, userFound.password )
            : false;

        if ( ! isValid ) {
            return res.status( 401 ).json({ msg: 'Credenciales invalidas' });
        }

        const token = generateToken( buildPayload( userFound ) );

        return res.json({
            msg: 'Inicio de sesion exitoso',
            token,
            data: userFound     // El JSON del modelo elimina el password
        });
    }
    catch ( error ) {
        console.error( error );
        return res.status( 500 ).json({ msg: 'No se pudo iniciar sesion' });
    }
}

// GET /api/auth/renew-token  -> (requiere authMiddleware) devuelve un token nuevo y los datos del usuario
const renewToken = ( req, res ) => {
    const userFound = req.userFound;        // Lo dejo authMiddleware

    return res.json({
        msg: 'Sesión válida',
        token: generateToken( buildPayload( userFound ) ),
        data: userFound
    });
}



// Delete 'api/auth/delete/:id Evita que el usuario se elimine a si mismo

const deleteUser = async(req, res) => {
    try{
        const {id} = req.body ??{};
        const currentUser = req.userFound;

        if(!currentUser){
            return res.status(401).json({msg: `Usuario no encontrado`})

           
        }

         const currentUserId = String(currentUser._id || currentUser.id || '');
            if(!id){
                return res.status(400).json({msg: `El ID del ususario es obligatorio`})
            }
            
            if(String(id) === currentUserId){
                return res.status(400).json({
                    msg:`No puedes eliminar tu propia cuenta de usuario`
                })
            }

            if (currentUser.role !==ROLES.GERENTE_GENERAL){
                return res.status(403).json({msg:`No tienes permisos para eliminar usuarios`})
            }

            const deleteUser = await dbDeleteUserById(id);

            if(!deleteUser){
                res.status(404).json({msg:  `Usuario no encontrado`});
            }

            return res.status(200).json({msg:`Usuario eliminado correctamente`})

    }

    catch (error){
        const validationErrors = handleMongooseError(error);
   

    if(validationErrors){
        return res.status(400).json(validationErrors)
    }

    console.error(error);
    return res.status(500).json({msg:`No se pudo eliminar el usuario `})
}

}


export {
    registerUser,
    loginUser,
    renewToken, 
    deleteUser
}
