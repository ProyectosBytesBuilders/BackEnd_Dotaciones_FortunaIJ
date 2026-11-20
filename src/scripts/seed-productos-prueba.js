// ⚠️ SOLO PARA PRUEBAS de Pedidos mientras el módulo de Inventario (Dilan) no esté listo.
// Uso:  npm run seed:productos
import mongoose from 'mongoose';
import conexion from '../config/mongo.config.js';
import ProductModel from '../models/product.model.js';

await conexion();

await ProductModel.deleteMany({ name: /\[PRUEBA\]/ });
const products = await ProductModel.insertMany([
    { name: '[PRUEBA] Camisa polo corporativa', price: 45000, stock: 20 },
    { name: '[PRUEBA] Pantalón dril industrial', price: 70000, stock: 10 },
    { name: '[PRUEBA] Botas de seguridad', price: 120000, stock: 3 },
    { name: '[PRUEBA] Chaleco reflectivo', price: 30000, stock: 0 }
]);

products.forEach( p => console.log( `${ p._id }  ${ p.name }  $${ p.price }  stock:${ p.stock }` ) );
await mongoose.disconnect();
