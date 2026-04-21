import { Router } from 'express';
import { 
    obtenerUsuarios, 
    suspenderUsuario, 
    verificarEmpresa,
    obtenerMetricasDashboard,
    obtenerTodasVacantes,
    eliminarVacante,
    obtenerPostsForo,
    activarUsuario,
    crearRecurso
} from '../controllers/admin.controller.js';

import { verificarToken } from '../middlewares/auth.js';

console.log(" ADMIN ROUTES ACTIVAS ");

const router = Router();

router.get('/test', (req, res) => {
    res.json({ mensaje: "Ruta admin funcionando" });
});

//  Todas protegidas
router.get('/usuarios', verificarToken, obtenerUsuarios);
router.patch('/usuarios/:id/suspender', verificarToken, suspenderUsuario);
router.patch('/empresas/:id/verificar', verificarToken, verificarEmpresa);

// AÑADIR LA RUTA DE MÉTRICAS AQUÍ
router.get('/metrics', verificarToken, obtenerMetricasDashboard);

router.get('/vacantes', verificarToken, obtenerTodasVacantes);
router.delete('/vacantes/:id', verificarToken, eliminarVacante);
router.get('/foro', verificarToken, obtenerPostsForo);
router.patch('/usuarios/:id/activar', verificarToken, activarUsuario);
router.post('/recursos', verificarToken, crearRecurso);

export default router;