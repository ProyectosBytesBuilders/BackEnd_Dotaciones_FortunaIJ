import { Router } from 'express';
import { authMiddleware } from '../middlewares/authenticate.middleware.js';
import { authorizationMiddleware } from '../middlewares/authorization.middleware.js';
import { ROLES } from '../constants/roles.js';
import {
    createProduct,
    getProducts,
    getProductById,
    updateProduct,
    updateProductMinStock,
    deleteProduct,
    restoreProduct
} from '../controllers/products.controllers.js';

const router = Router();

// Roles autorizados para modificar el inventario y sus existencias
const inventoryManagersOnly = [
    authMiddleware,
    authorizationMiddleware([ ROLES.GERENTE_GENERAL, ROLES.ADMIN_INVENTARIO ])
];

// Consulta de catálogo/stock: requiere sesión activa (Cliente ve catálogo activo; Gerente/Admin ven todo)
router.get( '/', authMiddleware, getProducts );
router.get( '/:id', authMiddleware, getProductById );

// Escritura y administración: exclusiva para GERENTE_GENERAL y ADMIN_INVENTARIO
router.post( '/', ...inventoryManagersOnly, createProduct );
router.put( '/:id', ...inventoryManagersOnly, updateProduct );
router.patch( '/:id/min-stock', ...inventoryManagersOnly, updateProductMinStock );
router.delete( '/:id', ...inventoryManagersOnly, deleteProduct );
router.patch( '/:id/restore', ...inventoryManagersOnly, restoreProduct );

export default router;