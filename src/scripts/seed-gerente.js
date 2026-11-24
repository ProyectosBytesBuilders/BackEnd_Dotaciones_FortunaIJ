// Crea el PRIMER Gerente General (el registro publico solo crea clientes).
// Uso:  npm run seed:gerente     (con SEED_GERENTE_* definidos en el .env)
import mongoose from 'mongoose';

import conexion from '../config/mongo.config.js';
import { generatePassword } from '../helpers/bcrypt.helpers.js';
import { passwordRegex, PASSWORD_MESSAGE } from '../helpers/validators.helpers.js';
import { dbCreateUser, dbGetUserByEmail } from '../services/users.services.js';
import { ROLES } from '../constants/roles.js';

const { SEED_GERENTE_NAME: name, 
    SEED_GERENTE_EMAIL: email, 
    SEED_GERENTE_PASSWORD: password,
     SEED_GERENTE_DOCUMENT_TYPE: documentType,
    SEED_GERENTE_DOCUMENT_NUMBER: documentNumber } = process.env;

const run = async () => {
    if ( ! name || ! email || ! password || ! documentType || ! documentNumber  ) {
        console.error( 'Define SEED_GERENTE_NAME, SEED_GERENTE_EMAIL, SEED_GERENTE_PASSWORD, SEED_GERENTE_DOCUMENT_TYPE, SEED_GERENTE_DOCUMENT_NUMBER en el .env' );
        process.exit( 1 );
    }

    if ( ! passwordRegex.test( password ) ) {
        console.error( PASSWORD_MESSAGE );
        process.exit( 1 );
    }

    await conexion();

    const exists = await dbGetUserByEmail( email.toLowerCase(), { status: { $in: [ true, false ] } } );

    if ( exists ) {
        console.log( 'Ya existe un usuario con ese correo. No se creo nada.' );
    }

    else {
        await dbCreateUser({
            name,
            email,
            documentType,
            documentNumber,
            password: await generatePassword( password ),
            role: ROLES.GERENTE_GENERAL
        });
        console.log( `Gerente General creado: ${ email }` );
    }

    await mongoose.disconnect();
}

run().catch( ( error ) => {
    console.error( error );
    process.exit( 1 );
});
