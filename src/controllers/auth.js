import { pool } from '../db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const registrarUsuario = async (req, res) => {
    const client = await pool.connect();
    try {
        const { correo_electronico, password, rol, nombre } = req.body;

        await client.query('BEGIN');

        // 1. Crear el usuario
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);
        const userRes = await client.query(
            `INSERT INTO usuarios (correo_electronico, password_hash, rol, estado) 
             VALUES ($1, $2, $3, 'ACTIVO') RETURNING id`,
            [correo_electronico, password_hash, rol]
        );
        const userId = userRes.rows[0].id;

        // 2. Crear el perfil automáticamente según el rol
        if (rol === 'CANDIDATO') {
            await client.query(
                'INSERT INTO candidatos (usuario_id, nombres, apellidos) VALUES ($1, $2, $3)',
                [userId, nombre, '']
            );
        } else if (rol === 'EMPRESA') {
            await client.query(
                'INSERT INTO empresas (usuario_id, razon_social) VALUES ($1, $2)',
                [userId, nombre]
            );
        }

        await client.query('COMMIT');
        res.status(201).json({ mensaje: 'Usuario y perfil creados exitosamente' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error en registro:', error.message);
        res.status(500).json({ error: 'Error al registrar usuario' });
    } finally {
        client.release();
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

        // Validación extra
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