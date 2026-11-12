// Crea el PRIMER Gerente General (el registro público solo crea clientes).
// Uso:  npm run seed:gerente     (con SEED_GERENTE_* definidos en el .env)
import mongoose from 'mongoose';

import conexion from '../config/mongo.config.js';
import { generatePassword } from '../helpers/bcrypt.helpers.js';
import { passwordRegex, PASSWORD_MESSAGE } from '../helpers/validators.helpers.js';
import { dbCreateUser, dbGetUserByEmail } from '../services/users.services.js';
import { ROLES } from '../constants/roles.js';

const { SEED_GERENTE_NAME: name, SEED_GERENTE_EMAIL: email, SEED_GERENTE_PASSWORD: password } = process.env;

const run = async () => {
    if ( ! name || ! email || ! password ) {
        console.error( 'Define SEED_GERENTE_NAME, SEED_GERENTE_EMAIL y SEED_GERENTE_PASSWORD en el .env' );
        process.exit( 1 );
    }

    if ( ! passwordRegex.test( password ) ) {
        console.error( PASSWORD_MESSAGE );
        process.exit( 1 );
    }

    await conexion();

    const exists = await dbGetUserByEmail( email.toLowerCase(), { status: { $in: [ true, false ] } } );

    if ( exists ) {
        console.log( 'Ya existe un usuario con ese correo. No se creó nada.' );
    }
    else {
        await dbCreateUser({
            name,
            email,
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
