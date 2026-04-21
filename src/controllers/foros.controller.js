import { pool } from '../db.js';

// Listar todos los foros
// En foros.controller.js
export const listarForos = async (req, res) => {
    try {
        // Hacemos un JOIN con la tabla usuarios para obtener el nombre o correo
        const result = await pool.query(
            `SELECT f.*, u.correo_electronico AS autor_nombre 
             FROM foros f 
             JOIN usuarios u ON f.usuario_id = u.id 
             WHERE f.activo = TRUE 
             ORDER BY f.creado_el DESC`
        );

        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error en listarForos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Obtener un foro por id
export const obtenerForoPorId = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'SELECT * FROM foros WHERE id = $1 AND activo = TRUE',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Foro no encontrado'
            });
        }

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Error en obtenerForoPorId:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
};

// Crear un foro
export const crearForo = async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        const { titulo, contenido, categoria_id } = req.body;

        if (!titulo || !contenido) {
            return res.status(400).json({
                error: 'Titulo y contenido son obligatorios'
            });
        }

        const result = await pool.query(
            `INSERT INTO foros (usuario_id, categoria_id, titulo, contenido)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [usuarioId, categoria_id || null, titulo, contenido]
        );

        res.status(201).json({
            mensaje: 'Foro creado correctamente',
            foro: result.rows[0]
        });
    } catch (error) {
        console.error('Error en crearForo:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
};

// Listar respuestas de un foro
export const listarRespuestasForo = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'SELECT * FROM respuestas_foro WHERE foro_id = $1 ORDER BY creado_el ASC',
            [id]
        );

        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error en listarRespuestasForo:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
};

// Crear respuesta en un foro
export const crearRespuestaForo = async (req, res) => {
    try {
        const { id } = req.params;
        const usuarioId = req.usuario.id;
        const { contenido } = req.body;

        if (!contenido) {
            return res.status(400).json({
                error: 'El contenido es obligatorio'
            });
        }

        const result = await pool.query(
            `INSERT INTO respuestas_foro (foro_id, usuario_id, contenido)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [id, usuarioId, contenido]
        );

        res.status(201).json({
            mensaje: 'Respuesta creada correctamente',
            respuesta: result.rows[0]
        });
    } catch (error) {
        console.error('Error en crearRespuestaForo:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
};

// Eliminar un foro permanentemente
export const eliminarForo = async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(
            'DELETE FROM foros WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Foro no encontrado' });
        }

        res.status(200).json({ mensaje: 'Foro eliminado correctamente' });
    } catch (error) {
        console.error('Error en eliminarForo:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};