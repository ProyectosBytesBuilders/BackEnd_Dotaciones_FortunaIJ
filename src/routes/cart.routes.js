import { Router } from 'express';
import { getCart, addItem, updateItem, removeItem, clearCart } from '../controllers/cart.controllers.js';
import { authMiddleware } from '../middlewares/authenticate.middleware.js';
import { authorizationMiddleware } from '../middlewares/authorization.middleware.js';
import { ROLES } from '../constants/roles.js';

const router = Router();

// Todo el carrito es solo para clientes con sesión iniciada
router.use( authMiddleware, authorizationMiddleware([ ROLES.CLIENTE ]) );

router.get( '/', getCart );
router.post( '/items', addItem );
router.patch( '/items/:productId', updateItem );
router.delete( '/items/:productId', removeItem );
router.delete( '/', clearCart );

export default router;
