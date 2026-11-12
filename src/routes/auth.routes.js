import { Router } from 'express';
import { registerUser, loginUser, renewToken } from '../controllers/auth.controllers.js';
import { authMiddleware } from '../middlewares/authenticate.middleware.js';

const router = Router();

router.post( '/register', registerUser );                    // Público: registro de clientes
router.post( '/login', loginUser );                          // Público: inicio de sesión
router.get( '/renew-token', authMiddleware, renewToken );    // Con sesión: renueva el token

export default router;
