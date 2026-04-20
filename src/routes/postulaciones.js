import { Router } from 'express';
import { postularVacante, obtenerPostulantesPorVacante } from '../controllers/postulaciones.js';
import { verificarToken } from '../middlewares/auth.js';

const router = Router();

// Todas las rutas de postulaciones requieren autenticación
router.use(verificarToken);

// POST /api/postulaciones - Candidato se postula a una vacante
router.post('/', postularVacante);

// GET /api/postulaciones/vacante/:vacanteId/postulantes - Empresa ve postulantes de su vacante
router.get('/vacante/:vacanteId/postulantes', obtenerPostulantesPorVacante);

export default router;