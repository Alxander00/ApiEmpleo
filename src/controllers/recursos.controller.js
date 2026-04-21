import { pool } from '../db.js';

const normalizarTexto = (texto = '') => texto.toString().trim();

// Listar recursos con búsqueda avanzada
export const listarRecursos = async (req, res) => {
    try {
        const q = normalizarTexto(req.query.q || req.query.search || '');
        const categoria = req.query.categoria || req.query.categoria_id || null;
        const tipo = normalizarTexto(req.query.tipo || '');

        const condiciones = ['r.publicado = TRUE'];
        const valores = [];

        if (q) {
            valores.push(`%${q}%`);
            const idx = valores.length;
            condiciones.push(`(
                r.titulo ILIKE $${idx}
                OR COALESCE(r.resumen, '') ILIKE $${idx}
                OR r.contenido ILIKE $${idx}
                OR COALESCE(r.autor, '') ILIKE $${idx}
                OR COALESCE(cr.nombre, '') ILIKE $${idx}
                OR COALESCE(r.tipo, '') ILIKE $${idx}
            )`);
        }

        if (categoria && categoria !== 'todos') {
            valores.push(categoria);
            condiciones.push(`r.categoria_id = $${valores.length}`);
        }

        if (tipo && tipo.toLowerCase() !== 'todos') {
            valores.push(tipo);
            condiciones.push(`r.tipo ILIKE $${valores.length}`);
        }

        const result = await pool.query(
            `SELECT 
                r.*,
                cr.nombre AS categoria_nombre,
                cr.descripcion AS categoria_descripcion
             FROM recursos r
             LEFT JOIN categorias_recurso cr ON r.categoria_id = cr.id
             WHERE ${condiciones.join(' AND ')}
             ORDER BY r.creado_el DESC`,
            valores
        );

        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error en listarRecursos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

export const listarCategoriasRecurso = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, nombre, descripcion
             FROM categorias_recurso
             WHERE activo = TRUE
             ORDER BY nombre ASC`
        );

        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error en listarCategoriasRecurso:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Obtener un recurso por id e incrementar vistas reales
export const obtenerRecursoPorId = async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        await client.query('BEGIN');

        const updateResult = await client.query(
            `UPDATE recursos
             SET vistas = COALESCE(vistas, 0) + 1,
                 actualizado_el = CURRENT_TIMESTAMP
             WHERE id = $1 AND publicado = TRUE
             RETURNING *`,
            [id]
        );

        if (updateResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Recurso no encontrado' });
        }

        const result = await client.query(
            `SELECT 
                r.*,
                cr.nombre AS categoria_nombre,
                cr.descripcion AS categoria_descripcion
             FROM recursos r
             LEFT JOIN categorias_recurso cr ON r.categoria_id = cr.id
             WHERE r.id = $1 AND r.publicado = TRUE`,
            [id]
        );

        await client.query('COMMIT');
        res.status(200).json(result.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error en obtenerRecursoPorId:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        client.release();
    }
};
