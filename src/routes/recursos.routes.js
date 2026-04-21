import { Router } from 'express';
import {
    listarRecursos,
    obtenerRecursoPorId,
    eliminarRecurso
} from '../controllers/recursos.controller.js';

const router = Router();

router.get('/', listarRecursos);
router.get('/:id', obtenerRecursoPorId);
router.delete('/:id', eliminarRecurso);

export default router;