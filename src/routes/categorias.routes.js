import { Router } from 'express';
import { 
    obtenerCategorias, 
    obtenerCategoriaPorId 
} from '../controllers/categorias.controller.js';

const router = Router();

// Rutas públicas
router.get('/', obtenerCategorias);
router.get('/:id', obtenerCategoriaPorId);

export default router;