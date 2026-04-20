import { Router } from 'express';
import {
    guardarMiEmpresa,
    obtenerMiEmpresa,
    listarEmpresas
} from '../controllers/empresas.controller.js';
import { verificarToken } from '../middlewares/auth.js';

const router = Router();

// Pública
router.get('/', listarEmpresas);

// Protegidas
router.post('/mi-empresa', verificarToken, guardarMiEmpresa);
router.get('/mi-empresa', verificarToken, obtenerMiEmpresa);

export default router;