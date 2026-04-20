import { pool } from '../db.js';

// 🔹 Ver todos los usuarios
export const obtenerUsuarios = async (req, res) => {
    try {
        if (req.usuario.rol !== 'ADMINISTRADOR') {
            return res.status(403).json({ error: 'Acceso solo para administradores' });
        }

        const usuarios = await pool.query(
            'SELECT id, correo_electronico, rol, estado FROM usuarios'
        );

        res.json(usuarios.rows);

    } catch (error) {
        console.error('Error obtenerUsuarios:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// 🔹 Suspender usuario
export const suspenderUsuario = async (req, res) => {
    try {
        if (req.usuario.rol !== 'ADMINISTRADOR') {
            return res.status(403).json({ error: 'Acceso solo para administradores' });
        }

        const { id } = req.params;

        await pool.query(
            "UPDATE usuarios SET estado = 'SUSPENDIDO' WHERE id = $1",
            [id]
        );

        res.json({ mensaje: 'Usuario suspendido correctamente' });

    } catch (error) {
        console.error('Error suspenderUsuario:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// 🔹 Verificar empresa
export const verificarEmpresa = async (req, res) => {
    try {
        if (req.usuario.rol !== 'ADMINISTRADOR') {
            return res.status(403).json({ error: 'Acceso solo para administradores' });
        }

        const { id } = req.params;

        await pool.query(
            "UPDATE empresas SET verificada = true WHERE id = $1",
            [id]
        );

        res.json({ mensaje: 'Empresa verificada correctamente' });

    } catch (error) {
        console.error('Error verificarEmpresa:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};