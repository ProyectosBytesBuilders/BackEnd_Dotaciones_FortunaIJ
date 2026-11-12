import express from 'express';
import cors from 'cors';

import conexion from './config/mongo.config.js';
import authRoute from './routes/auth.routes.js';

// Sin secreto no se pueden firmar tokens: mejor detenerse que arrancar inseguro
if ( ! process.env.JWT_SECRET ) {
    console.error( 'Falta la variable JWT_SECRET en el archivo .env' );
    process.exit( 1 );
}

const port = process.env.PORT || 3000;
const app = express();

conexion();

// Permite que el FrontEnd (otro origen) consuma la API
app.use( cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }) );

// Interpretar JSON
app.use( express.json() );

app.get( '/health', ( req, res ) => {
    res.json({ msg: 'Servidor de Dotaciones FortunaIJ funcionando' });
});

// ── Rutas ──
app.use( '/api/auth', authRoute );
// Cada integrante agrega aquí las rutas de su módulo, en su rama:
// app.use( '/api/users', usersRoute );          // Gestión de Usuarios
// app.use( '/api/products', productsRoute );    // Administración de Inventario
// app.use( '/api/orders', ordersRoute );        // Gestión de Pedidos
// app.use( '/api/pqrs', pqrsRoute );            // Gestión de PQRS

// Ruta no encontrada
// app.use(( req, res ) => {
//     res.status( 404 ).json({ msg: `Ruta ${ req.method } ${ req.originalUrl } no encontrada` });
// });

// Manejo de errores no controlados (ej: JSON mal formado en el body)
// app.use(( error, req, res, next ) => {
//     if ( error.type === 'entity.parse.failed' ) {
//         return res.status( 400 ).json({ msg: 'El cuerpo de la petición no es un JSON válido' });
//     }

//     console.error( error );
//     res.status( 500 ).json({ msg: 'Error interno del servidor' });
// });

app.listen( port, () => {
    console.log( `Servidor corriendo en http://localhost:${ port }` );
});
