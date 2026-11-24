import { Router } from 'express';
import { registerUser, loginUser, renewToken, deleteUser } from '../controllers/auth.controllers.js';
import { authMiddleware } from '../middlewares/authenticate.middleware.js';

const router = Router();

router.post( '/register', registerUser );                    // Publico: registro de clientes
router.post( '/login', loginUser );                          // Publico: inicio de sesion
router.delete('/delete', authMiddleware, deleteUser);     // Protegida: requiere sesion valida
router.get( '/renew-token', authMiddleware, renewToken );    // Con sesion: renueva el token

export default router;
