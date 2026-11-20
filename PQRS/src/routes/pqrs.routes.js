import { Router } from 'express';
import {
    createPqrs,
    getPqrs,
    getPqrsById,
    replacePqrs,
    patchPqrs,
    deletePqrs
} from '../controllers/pqrs.controllers.js';

// Crea una instancia de las rutas de Express
const router = Router();

// Define las rutas para gestionar las PQRS
router.post('/', createPqrs);
router.get('/', getPqrs);
router.get('/:id', getPqrsById);
router.put('/:id', replacePqrs);
router.patch('/:id', patchPqrs);
router.delete('/:id', deletePqrs);

// Exporta las rutas para enlazarlas desde index.js
export default router;
