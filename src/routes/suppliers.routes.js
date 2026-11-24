import { Router } from 'express';
import { authMiddleware } from '../middlewares/authenticate.middleware.js';
import { authorizationMiddleware } from '../middlewares/authorization.middleware.js';
import { ROLES } from '../constants/roles.js';
import {
    createSupplier,
    getSuppliers,
    getSupplierById,
    updateSupplier,
    deleteSupplier,
    restoreSupplier
} from '../controllers/suppliers.controllers.js';

const router = Router();

// Únicamente Gerente General y Administrador de Inventario gestionan proveedores
const inventoryManagersOnly = [
    authMiddleware,
    authorizationMiddleware([ ROLES.GERENTE_GENERAL, ROLES.ADMIN_INVENTARIO ])
];

router.get( '/', ...inventoryManagersOnly, getSuppliers );
router.get( '/:id', ...inventoryManagersOnly, getSupplierById );
router.post( '/', ...inventoryManagersOnly, createSupplier );
router.put( '/:id', ...inventoryManagersOnly, updateSupplier );
router.delete( '/:id', ...inventoryManagersOnly, deleteSupplier );
router.patch( '/:id/restore', ...inventoryManagersOnly, restoreSupplier );

export default router;