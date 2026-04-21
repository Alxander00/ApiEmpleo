import { Router } from 'express';
import {
    crearPerfilCandidato,
    obtenerMiPerfil,
    registrarVistaPerfil,
    obtenerCandidatoPorId
} from '../controllers/candidato.controller.js';
import { verificarToken } from '../middlewares/auth.js';

const router = Router();

router.use(verificarToken);

// Rutas
router.post('/mi-perfil', crearPerfilCandidato);
router.get('/mi-perfil', obtenerMiPerfil);
router.get('/:id', obtenerCandidatoPorId);
router.post('/:id/vista', registrarVistaPerfil);

export default router;
