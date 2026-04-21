import { pool } from '../db.js';

// Listar todos los recursos
export const listarRecursos = async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM recursos WHERE publicado = TRUE ORDER BY creado_el DESC'
        );

        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error en listarRecursos:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
};

// Obtener un recurso por id
export const obtenerRecursoPorId = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'SELECT * FROM recursos WHERE id = $1 AND publicado = TRUE',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Recurso no encontrado'
            });
        }

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Error en obtenerRecursoPorId:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
};

// Eliminar un recurso permanentemente
export const eliminarRecurso = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'DELETE FROM recursos WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Recurso no encontrado' });
        }

        res.status(200).json({ mensaje: 'Recurso eliminado correctamente' });
    } catch (error) {
        console.error('Error en eliminarRecurso:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};