import { Router } from 'express';
import { 
    crearVacante, 
    obtenerVacantes, 
    editarVacante, 
    cerrarVacante,
    obtenerMisVacantes ,
    obtenerDetalleVacanteFull,
    eliminarVacante
} from '../controllers/vacantes.controller.js';

import { verificarToken } from '../middlewares/auth.js';

const router = Router();

// Público
router.get('/', obtenerVacantes);

// Protegidas
router.post('/', verificarToken, crearVacante);
router.put('/:id', verificarToken, editarVacante);
router.patch('/:id/cerrar', verificarToken, cerrarVacante);
router.get('/mis-vacantes', verificarToken, obtenerMisVacantes);
router.get('/:id', verificarToken, obtenerDetalleVacanteFull);
router.delete('/:id', verificarToken, eliminarVacante);

export default router;