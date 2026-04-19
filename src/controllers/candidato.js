// src/controllers/candidatos.controller.js
import { pool } from '../db.js';

// 1. Crear o actualizar el perfil del candidato
export const crearPerfilCandidato = async (req, res) => {
    try {
        const usuarioId = req.usuario.id; 
        const { nombres, apellidos, telefono_contacto, titular_profesional, resumen_biografico, habilidades_tecnicas } = req.body;

        if (!nombres || !apellidos) {
            return res.status(400).json({ error: 'Nombres y apellidos son obligatorios' });
        }

        const perfilExistente = await pool.query('SELECT id FROM candidatos WHERE usuario_id = $1', [usuarioId]);

        let resultado;

        if (perfilExistente.rows.length > 0) {
            // ACTUALIZAR (UPDATE)
            resultado = await pool.query(
                `UPDATE candidatos 
                 SET nombres = $1, apellidos = $2, telefono_contacto = $3, titular_profesional = $4, resumen_biografico = $5, habilidades_tecnicas = $6, actualizado_el = CURRENT_TIMESTAMP
                 WHERE usuario_id = $7 RETURNING *`,
                [nombres, apellidos, telefono_contacto, titular_profesional, resumen_biografico, habilidades_tecnicas, usuarioId]
            );
        } else {
            // CREAR NUEVO (INSERT)
            resultado = await pool.query(
                `INSERT INTO candidatos (usuario_id, nombres, apellidos, telefono_contacto, titular_profesional, resumen_biografico, habilidades_tecnicas) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
                [usuarioId, nombres, apellidos, telefono_contacto, titular_profesional, resumen_biografico, habilidades_tecnicas]
            );
        }

        res.status(200).json({
            mensaje: 'Perfil guardado exitosamente',
            perfil: resultado.rows[0]
        });

    } catch (error) {
        console.error('Error en crearPerfilCandidato:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// 2. Obtener mi propio perfil
export const obtenerMiPerfil = async (req, res) => {
    try {
        const usuarioId = req.usuario.id;

        const resultado = await pool.query(
            'SELECT * FROM candidatos WHERE usuario_id = $1',
            [usuarioId]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({ error: 'Aún no has creado tu perfil de candidato' });
        }

        res.json(resultado.rows[0]);

    } catch (error) {
        console.error('Error en obtenerMiPerfil:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};