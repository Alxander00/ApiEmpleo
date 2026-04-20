import { Router } from 'express';
import { crearPerfilCandidato, obtenerMiPerfil, registrarVistaPerfil } from '../controllers/candidato.js';
import { verificarToken } from '../middlewares/auth.js';

const router = Router();

router.use(verificarToken);

// Rutas
router.post('/mi-perfil', crearPerfilCandidato); // POST para crear o actualizar
router.get('/mi-perfil', obtenerMiPerfil);   
router.post('/:id/vista', registrarVistaPerfil);    // GET para ver sus datos

export default router;