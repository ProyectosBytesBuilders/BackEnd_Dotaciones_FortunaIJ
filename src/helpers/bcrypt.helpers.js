import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

// Convierte la contraseña original en un hash. Es asíncrono para no bloquear el servidor.
const generatePassword = ( originalPassword ) => {
    return bcrypt.hash( originalPassword, SALT_ROUNDS );
}

// Compara la contraseña escrita por el usuario con el hash guardado. Devuelve true o false.
const verifyPassword = ( originalPassword, hashPassword ) => {
    return bcrypt.compare( originalPassword, hashPassword );
}

export {
    generatePassword,
    verifyPassword
}
