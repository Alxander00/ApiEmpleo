import { Router } from 'express';
import {
    listarRecursos,
    obtenerRecursoPorId
} from '../controllers/recursos.controller.js';

const router = Router();

router.get('/', listarRecursos);
router.get('/:id', obtenerRecursoPorId);

export default router;