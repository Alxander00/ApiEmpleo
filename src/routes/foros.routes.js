import { Router } from 'express';
import {
    listarForos,
    obtenerForoPorId,
    crearForo,
    listarRespuestasForo,
    crearRespuestaForo,
    eliminarForo
} from '../controllers/foros.controller.js';
import { verificarToken } from '../middlewares/auth.js';

const router = Router();

router.get('/', listarForos);
router.get('/:id', obtenerForoPorId);
router.get('/:id/respuestas', listarRespuestasForo);
router.post('/', verificarToken, crearForo);
router.post('/:id/respuestas', verificarToken, crearRespuestaForo);
router.delete('/:id', verificarToken, eliminarForo);

export default router;