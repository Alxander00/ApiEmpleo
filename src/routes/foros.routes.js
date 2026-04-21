import { Router } from 'express';
import {
    listarForos,
    listarCategoriasForo,
    obtenerForoPorId,
    crearForo,
    listarRespuestasForo,
    crearRespuestaForo
} from '../controllers/foros.controller.js';
import { verificarToken } from '../middlewares/auth.js';

const router = Router();

router.get('/categorias', listarCategoriasForo);
router.get('/', listarForos);
router.get('/:id', obtenerForoPorId);
router.get('/:id/respuestas', listarRespuestasForo);
router.post('/', verificarToken, crearForo);
router.post('/:id/respuestas', verificarToken, crearRespuestaForo);

export default router;
