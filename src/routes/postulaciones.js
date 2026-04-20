import { Router } from 'express';
// Agregamos la función de actualizar al import
import { postularVacante, obtenerPostulantesPorVacante, actualizarEstadoPostulacion, obtenerMisPostulaciones } from '../controllers/postulaciones.js';
import { verificarToken } from '../middlewares/auth.js';

const router = Router();

// Todas las rutas de postulaciones requieren autenticación
router.use(verificarToken);

// POST /api/postulaciones - Candidato se postula a una vacante
router.post('/', postularVacante);

// GET /api/postulaciones/vacante/:vacanteId/postulantes - Empresa ve postulantes de su vacante
router.get('/vacante/:vacanteId/postulantes', obtenerPostulantesPorVacante);

// PATCH /api/postulaciones/:id - NUEVA RUTA: Empresa actualiza el estado del candidato
router.patch('/:id', actualizarEstadoPostulacion);

router.get('/mis-postulaciones', obtenerMisPostulaciones);

export default router;