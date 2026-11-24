import { Router } from 'express';
import { authMiddleware } from '../middlewares/authenticate.middleware.js';
import { authorizationMiddleware } from '../middlewares/authorization.middleware.js';
import { ROLES } from '../constants/roles.js';
import {
    registerInventoryEntry,
    registerInventoryExit,
    registerProductionUsage,
    registerInventoryAdjustment,
    getInventoryMovements,
    getProductMovements,
    getLowStockAlerts,
    getInventorySummary,
    checkOrderStockAvailability
} from '../controllers/inventory.controllers.js';

const router = Router();

// Todas las operaciones de movimientos, Kardex, alertas y resumen son exclusivas de:
// Gerente General y Administrador de Inventario
const inventoryManagersOnly = [
    authMiddleware,
    authorizationMiddleware([ ROLES.GERENTE_GENERAL, ROLES.ADMIN_INVENTARIO ])
];

router.get( '/summary', ...inventoryManagersOnly, getInventorySummary );
router.get( '/alerts/low-stock', ...inventoryManagersOnly, getLowStockAlerts );
router.get( '/movements', ...inventoryManagersOnly, getInventoryMovements );
router.get( '/movements/product/:productId', ...inventoryManagersOnly, getProductMovements );

router.post( '/movements/entry', ...inventoryManagersOnly, registerInventoryEntry );
router.post( '/movements/exit', ...inventoryManagersOnly, registerInventoryExit );
router.post( '/movements/production', ...inventoryManagersOnly, registerProductionUsage );
router.post( '/movements/adjustment', ...inventoryManagersOnly, registerInventoryAdjustment );
router.post( '/check-availability', ...inventoryManagersOnly, checkOrderStockAvailability );

export default router;