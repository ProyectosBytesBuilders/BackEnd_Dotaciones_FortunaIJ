import UserModel from '../models/user.model.js';

// Registrar un usuario en la BD (Mongoose valida contra el Schema)
const dbCreateUser = async ( newUser ) => {
    return await UserModel.create( newUser );
}

// Buscar por correo. withPassword: true solo para el login (necesita el hash para comparar).
const dbGetUserByEmail = async ( email, { status = true, withPassword = false } = {} ) => {
    const query = UserModel.findOne({ email, status });

    if ( withPassword ) query.select( '+password' );

    return await query;
}

// Buscar por id (solo usuarios activos por defecto)
const dbGetUserById = async ( id, status = true ) => {
    return await UserModel.findOne({ _id: id, status });
}

export {
    dbCreateUser,
    dbGetUserByEmail,
    dbGetUserById
}
