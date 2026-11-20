// const express = require('express'); // CommonJS
import express from 'express'; // ES Module

// Importa la conexión con MongoDB Atlas
import conexion from './config/mongo.config.js';

// Importa las rutas del módulo PQRS
import pqrsrouter from './routes/pqrs.routes.js';

const app = express();

// Permite recibir información en formato JSON
app.use(express.json());

// Endpoint para verificar que el servidor funciona
app.get('/health', (req, res) => {
    res.json({ msg: 'Servidor de PQRS de Dotaciones Fortuna IJ funcionando' });
});

// Enlaza las rutas del módulo PQRS
app.use('/api/pqrs', pqrsrouter);

// Respuesta para rutas que no existen
app.use((req, res) => {
    res.status(404).json({ msg: 'La ruta solicitada no existe' });
});

// Conecta primero con MongoDB Atlas y después inicia el servidor
const iniciarServidor = async () => {
    try {
        await conexion();

        const port = process.env.PORT || 3000;
        app.listen(port, () => {
            console.log(`Servidor corriendo en http://localhost:${port}`);
        });
    } catch (error) {
        console.error('No fue posible iniciar el backend. Verifica la configuración de MongoDB Atlas.');
        process.exit(1);
    }
};

iniciarServidor();
