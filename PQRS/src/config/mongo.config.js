import mongoose from 'mongoose';

// Obtiene la cadena de conexión definida en el archivo .env
const URI_MONGO = process.env.URI_MONGO;

// Establece la conexión entre el backend y MongoDB Atlas
const conexion = async () => {
    if (!URI_MONGO) {
        throw new Error('No se encontró URI_MONGO. Configura el archivo .env');
    }

    try {
        await mongoose.connect(URI_MONGO);
        console.log('Conectado a la base de datos MongoDB Atlas');
    } catch (error) {
        console.error('Error al conectar con MongoDB Atlas:', error.message);
        throw error;
    }
};

export default conexion;
