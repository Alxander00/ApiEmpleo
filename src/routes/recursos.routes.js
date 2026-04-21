import { Router } from 'express';
import {
    listarRecursos,
    listarCategoriasRecurso,
    obtenerRecursoPorId
} from '../controllers/recursos.controller.js';

const router = Router();

router.get('/categorias', listarCategoriasRecurso);
router.get('/', listarRecursos);
router.get('/:id', obtenerRecursoPorId);

export default router;
