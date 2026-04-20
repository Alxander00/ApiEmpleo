import { Router } from 'express';
import { 
    obtenerUsuarios, 
    suspenderUsuario, 
    verificarEmpresa 
} from '../controllers/admin.controller.js';

import { verificarToken } from '../middlewares/auth.js';

// 🔥 DEBUG: confirmar que el archivo se está cargando
console.log("🔥 ADMIN ROUTES ACTIVAS 🔥");

const router = Router();

// 🔥 Ruta de prueba (sin token)
router.get('/test', (req, res) => {
    res.json({ mensaje: "Ruta admin funcionando 🔥" });
});

// 🔹 Todas protegidas
router.get('/usuarios', verificarToken, obtenerUsuarios);
router.patch('/usuarios/:id/suspender', verificarToken, suspenderUsuario);
router.patch('/empresas/:id/verificar', verificarToken, verificarEmpresa);

export default router;