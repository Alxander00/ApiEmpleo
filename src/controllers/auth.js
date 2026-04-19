import { pool } from '../db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const registrarUsuario = async (req, res) => {
    try {
        const { correo_electronico, password, rol } = req.body;

        if (!correo_electronico || !password || !rol) {
            return res.status(400).json({ error: 'Todos los campos son obligatorios' });
        }

        const usuarioExistente = await pool.query(
            'SELECT * FROM usuarios WHERE correo_electronico = $1',
            [correo_electronico]
        );

        if (usuarioExistente.rows.length > 0) {
            return res.status(400).json({ error: 'El correo ya está registrado' });
        }

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const nuevoUsuario = await pool.query(
            `INSERT INTO usuarios (correo_electronico, password_hash, rol, estado) 
             VALUES ($1, $2, $3, 'ACTIVO') 
             RETURNING id, correo_electronico, rol, estado, creado_el`,
            [correo_electronico, password_hash, rol]
        );

        res.status(201).json({
            mensaje: 'Usuario creado exitosamente',
            usuario: nuevoUsuario.rows[0]
        });

    } catch (error) {
        console.error('Error en registrarUsuario:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

export const loginUsuario = async (req, res) => {
    try {
        const { correo_electronico, password } = req.body;

        if (!correo_electronico || !password) {
            return res.status(400).json({ error: 'Correo y contraseña son obligatorios' });
        }

        const resultado = await pool.query(
            'SELECT * FROM usuarios WHERE correo_electronico = $1',
            [correo_electronico]
        );

        if (resultado.rows.length === 0) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const usuario = resultado.rows[0];

        // 🔥 Validación extra (evita errores raros)
        if (!usuario.password_hash) {
            return res.status(500).json({ error: 'Usuario sin contraseña válida' });
        }

        const passwordValida = await bcrypt.compare(password, usuario.password_hash);

        if (!passwordValida) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const token = jwt.sign(
            { id: usuario.id, rol: usuario.rol },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            mensaje: 'Inicio de sesión exitoso.',
            token: token,
            usuario: {
                id: usuario.id,
                correo_electronico: usuario.correo_electronico,
                rol: usuario.rol
            }
        });

    } catch (error) {
        // ✅ CORREGIDO AQUÍ
        console.error('Error en loginUsuario:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

export const obtenerPerfilActual = async (req, res) => {
    try {
        const idUsuario = req.usuario.id;

        const resultado = await pool.query(
            'SELECT id, correo_electronico, rol, estado, creado_el FROM usuarios WHERE id = $1',
            [idUsuario]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json(resultado.rows[0]);

    } catch (error) {
        console.error('Error en obtenerPerfilActual:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};