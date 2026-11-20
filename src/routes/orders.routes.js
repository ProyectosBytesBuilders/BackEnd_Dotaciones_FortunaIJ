import { Router } from 'express';
import { createOrder, getMyOrders, getAllOrders, getOrderById, changeStatus, cancelMyOrder } from '../controllers/orders.controllers.js';
import { authMiddleware } from '../middlewares/authenticate.middleware.js';
import { authorizationMiddleware } from '../middlewares/authorization.middleware.js';
import { ROLES } from '../constants/roles.js';

const router = Router();

const STAFF = [ ROLES.GERENTE_GENERAL, ROLES.ADMIN_INVENTARIO ];

router.use( authMiddleware );      // Todas requieren sesión

// Cliente
router.post( '/', authorizationMiddleware([ ROLES.CLIENTE ]), createOrder );
router.get( '/my', authorizationMiddleware([ ROLES.CLIENTE ]), getMyOrders );    // ⚠️ Antes de '/:id'
router.patch( '/:id/cancel', authorizationMiddleware([ ROLES.CLIENTE ]), cancelMyOrder );

// Personal
router.get( '/', authorizationMiddleware( STAFF ), getAllOrders );
router.patch( '/:id/status', authorizationMiddleware( STAFF ), changeStatus );

// Dueño o personal (el controlador revisa la propiedad)
router.get( '/:id', getOrderById );

export default router;
