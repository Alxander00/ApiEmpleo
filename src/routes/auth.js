import { Router } from 'express';
import { loginUsuario, obtenerPerfilActual, registrarUsuario } from '../controllers/auth.js';
import { verificarToken } from '../middlewares/auth.js';

const router = Router();

//Ruta para registrarse
router.post('/registro', registrarUsuario);

// Ruta para login
router.post('/login', loginUsuario);

// Obtener perfil con la verificacion del token
router.get('/perfil', verificarToken, obtenerPerfilActual);

export default router;