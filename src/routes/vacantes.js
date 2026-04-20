import { Router } from 'express';
import { 
    crearVacante, 
    obtenerVacantes, 
    editarVacante, 
    cerrarVacante 
} from '../controllers/vacantes.controller.js';

import { verificarToken } from '../middlewares/auth.js';

const router = Router();

// 🔓 Público
router.get('/', obtenerVacantes);

// 🔒 Protegidas
router.post('/', verificarToken, crearVacante);
router.put('/:id', verificarToken, editarVacante);
router.patch('/:id/cerrar', verificarToken, cerrarVacante);

export default router;