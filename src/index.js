import express from 'express';
import cors from 'cors';

import conexion from './config/mongo.config.js';
import authRoute from './routes/auth.routes.js';
import productsRoute from './routes/products.routes.js';
import suppliersRoute from './routes/suppliers.routes.js';
import inventoryRoute from './routes/inventory.routes.js';

// Sin secreto no se pueden firmar tokens: mejor detenerse que arrancar inseguro
if ( ! process.env.JWT_SECRET ) {
    console.error( 'Falta la variable JWT_SECRET en el archivo .env' );
    process.exit( 1 );
}

const port = process.env.PORT || 3000;
const app = express();

conexion();

// Configuración CORS lista para conectar el FrontEnd (soporta uno o varios orígenes separados por coma)
const allowedOrigins = ( process.env.CORS_ORIGIN || 'http://localhost:5173' )
    .split( ',' )
    .map( origin => origin.trim() );

app.use( cors({
    origin: allowedOrigins.length === 1 ? allowedOrigins[ 0 ] : allowedOrigins,
    methods: [ 'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS' ],
    allowedHeaders: [ 'Content-Type', 'Authorization' ],
    credentials: true
}) );

// Interpretar JSON
app.use( express.json({ limit: '1mb' }) );

app.get( '/health', ( req, res ) => {
    res.json({ msg: 'Servidor de Dotaciones FortunaIJ funcionando' });
});

// ── Rutas ──
app.use( '/api/auth', authRoute );
app.use( '/api/products', productsRoute );       // Administración de Inventario (Materiales / Dotaciones)
app.use( '/api/suppliers', suppliersRoute );     // Administración de Inventario (Proveedores)
app.use( '/api/inventory', inventoryRoute );     // Administración de Inventario (Movimientos, Alertas y Resumen)
// Cada integrante agrega aquí las rutas de su módulo, en su rama:
// app.use( '/api/users', usersRoute );          // Gestión de Usuarios (Brayan)
// app.use( '/api/orders', ordersRoute );        // Gestión de Pedidos (Samuel)
// app.use( '/api/pqrs', pqrsRoute );            // Gestión de PQRS (Antony)

// Ruta no encontrada
app.use( ( req, res ) => {
    res.status( 404 ).json({ msg: `Ruta ${ req.method } ${ req.originalUrl } no encontrada` });
});

// Manejo de errores no controlados (ej: JSON mal formado en el body)
app.use( ( error, req, res, next ) => {
    if ( error.type === 'entity.parse.failed' ) {
        return res.status( 400 ).json({ msg: 'El cuerpo de la petición no es un JSON válido' });
    }

    console.error( error );
    res.status( 500 ).json({ msg: 'Error interno del servidor' });
});

app.listen( port, () => {
    console.log( `Servidor corriendo en http://localhost:${ port }` );
});