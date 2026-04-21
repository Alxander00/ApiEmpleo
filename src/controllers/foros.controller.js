import { pool } from '../db.js';

const nombreVisibleUsuario = `COALESCE(
    NULLIF(TRIM(CONCAT(COALESCE(c.nombres, ''), ' ', COALESCE(c.apellidos, ''))), ''),
    NULLIF(TRIM(COALESCE(e.nombre_comercial, e.razon_social, '')), ''),
    u.correo_electronico,
    'Usuario'
)`;

// Listar todos los foros con nombre real, categoría y total de respuestas
export const listarForos = async (req, res) => {
    try {
        const q = (req.query.q || req.query.search || '').toString().trim();
        const categoria = req.query.categoria || req.query.categoria_id || null;

        const valores = [];
        const condiciones = ['f.activo = TRUE'];

        if (q) {
            valores.push(`%${q}%`);
            const idx = valores.length;
            condiciones.push(`(
                f.titulo ILIKE $${idx}
                OR f.contenido ILIKE $${idx}
                OR COALESCE(cf.nombre, '') ILIKE $${idx}
                OR ${nombreVisibleUsuario} ILIKE $${idx}
            )`);
        }

        if (categoria && categoria !== 'todos') {
            valores.push(categoria);
            condiciones.push(`f.categoria_id = $${valores.length}`);
        }

        const result = await pool.query(
            `SELECT 
                f.id,
                f.usuario_id,
                f.categoria_id,
                f.titulo,
                f.contenido,
                f.votos,
                f.vistas,
                f.activo,
                f.creado_el,
                f.actualizado_el,
                cf.nombre AS categoria_nombre,
                ${nombreVisibleUsuario} AS autor_nombre,
                COUNT(rf.id)::INT AS total_respuestas
             FROM foros f
             LEFT JOIN categorias_foro cf ON f.categoria_id = cf.id
             LEFT JOIN usuarios u ON f.usuario_id = u.id
             LEFT JOIN candidatos c ON c.usuario_id = u.id
             LEFT JOIN empresas e ON e.usuario_id = u.id
             LEFT JOIN respuestas_foro rf ON rf.foro_id = f.id
             WHERE ${condiciones.join(' AND ')}
             GROUP BY f.id, cf.nombre, u.correo_electronico, c.nombres, c.apellidos, e.nombre_comercial, e.razon_social
             ORDER BY f.creado_el DESC`,
            valores
        );

        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error en listarForos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

export const listarCategoriasForo = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, nombre, descripcion
             FROM categorias_foro
             WHERE activo = TRUE
             ORDER BY nombre ASC`
        );
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error en listarCategoriasForo:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Obtener un foro por id, incrementar vistas y devolver nombre real
export const obtenerForoPorId = async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        await client.query('BEGIN');

        const updateResult = await client.query(
            `UPDATE foros
             SET vistas = COALESCE(vistas, 0) + 1,
                 actualizado_el = CURRENT_TIMESTAMP
             WHERE id = $1 AND activo = TRUE
             RETURNING id`,
            [id]
        );

        if (updateResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Foro no encontrado' });
        }

        const result = await client.query(
            `SELECT 
                f.id,
                f.usuario_id,
                f.categoria_id,
                f.titulo,
                f.contenido,
                f.votos,
                f.vistas,
                f.activo,
                f.creado_el,
                f.actualizado_el,
                cf.nombre AS categoria_nombre,
                ${nombreVisibleUsuario} AS autor_nombre,
                COUNT(rf.id)::INT AS total_respuestas
             FROM foros f
             LEFT JOIN categorias_foro cf ON f.categoria_id = cf.id
             LEFT JOIN usuarios u ON f.usuario_id = u.id
             LEFT JOIN candidatos c ON c.usuario_id = u.id
             LEFT JOIN empresas e ON e.usuario_id = u.id
             LEFT JOIN respuestas_foro rf ON rf.foro_id = f.id
             WHERE f.id = $1 AND f.activo = TRUE
             GROUP BY f.id, cf.nombre, u.correo_electronico, c.nombres, c.apellidos, e.nombre_comercial, e.razon_social`,
            [id]
        );

        await client.query('COMMIT');
        res.status(200).json(result.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error en obtenerForoPorId:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        client.release();
    }
};

// Crear un foro
export const crearForo = async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        const { titulo, contenido, categoria_id } = req.body;

        if (!titulo || !contenido) {
            return res.status(400).json({ error: 'Titulo y contenido son obligatorios' });
        }

        const result = await pool.query(
            `INSERT INTO foros (usuario_id, categoria_id, titulo, contenido)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [usuarioId, categoria_id || null, titulo, contenido]
        );

        res.status(201).json({ mensaje: 'Foro creado correctamente', foro: result.rows[0] });
    } catch (error) {
        console.error('Error en crearForo:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Listar respuestas de un foro con nombres reales
export const listarRespuestasForo = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT 
                rf.id,
                rf.foro_id,
                rf.usuario_id,
                rf.contenido,
                rf.votos,
                rf.creado_el,
                rf.actualizado_el,
                ${nombreVisibleUsuario} AS autor_nombre
             FROM respuestas_foro rf
             LEFT JOIN usuarios u ON rf.usuario_id = u.id
             LEFT JOIN candidatos c ON c.usuario_id = u.id
             LEFT JOIN empresas e ON e.usuario_id = u.id
             WHERE rf.foro_id = $1
             ORDER BY rf.creado_el ASC`,
            [id]
        );

        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error en listarRespuestasForo:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Crear respuesta en un foro y devolverla con nombre real
export const crearRespuestaForo = async (req, res) => {
    try {
        const { id } = req.params;
        const usuarioId = req.usuario.id;
        const { contenido } = req.body;

        if (!contenido) {
            return res.status(400).json({ error: 'El contenido es obligatorio' });
        }

        const insert = await pool.query(
            `INSERT INTO respuestas_foro (foro_id, usuario_id, contenido)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [id, usuarioId, contenido]
        );

        const respuestaId = insert.rows[0].id;

        const result = await pool.query(
            `SELECT 
                rf.id,
                rf.foro_id,
                rf.usuario_id,
                rf.contenido,
                rf.votos,
                rf.creado_el,
                rf.actualizado_el,
                ${nombreVisibleUsuario} AS autor_nombre
             FROM respuestas_foro rf
             LEFT JOIN usuarios u ON rf.usuario_id = u.id
             LEFT JOIN candidatos c ON c.usuario_id = u.id
             LEFT JOIN empresas e ON e.usuario_id = u.id
             WHERE rf.id = $1`,
            [respuestaId]
        );

        res.status(201).json({
            mensaje: 'Respuesta creada correctamente',
            respuesta: result.rows[0]
        });
    } catch (error) {
        console.error('Error en crearRespuestaForo:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};
