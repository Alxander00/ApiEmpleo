import { Router } from 'express';
import {
    listarForos,
    obtenerForoPorId,
    crearForo,
    listarRespuestasForo,
    crearRespuestaForo
} from '../controllers/foros.controller.js';
import { verificarToken } from '../middlewares/auth.js';

const router = Router();

// Públicas
router.get('/', listarForos);
router.get('/:id', obtenerForoPorId);
router.get('/:id/respuestas', listarRespuestasForo);

// Protegidas
router.post('/', verificarToken, crearForo);
router.post('/:id/respuestas', verificarToken, crearRespuestaForo);

export default router;