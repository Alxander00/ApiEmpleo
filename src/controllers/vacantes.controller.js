import { pool } from '../db.js';

// Crear vacante
export const crearVacante = async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        const rol = req.usuario.rol;

        if (rol !== 'EMPRESA') {
            return res.status(403).json({ error: 'Solo empresas pueden publicar vacantes' });
        }

        const empresa = await pool.query(
            'SELECT id FROM empresas WHERE usuario_id = $1',
            [usuarioId]
        );

        if (empresa.rows.length === 0) {
            return res.status(400).json({ error: 'No tienes una empresa registrada' });
        }

        const empresaId = empresa.rows[0].id;

        const {
            titulo_puesto,
            descripcion_puesto,
            requisitos,
            beneficios,
            rango_salarial_min,
            rango_salarial_max,
            ubicacion_especifica,
            modalidad,
            categoria_id,
            fecha_vencimiento
        } = req.body;

        const nuevaVacante = await pool.query(
            `INSERT INTO vacantes 
            (empresa_id, titulo_puesto, descripcion_puesto, requisitos, beneficios, 
            rango_salarial_min, rango_salarial_max, ubicacion_especifica, modalidad, categoria_id, fecha_vencimiento)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
            RETURNING *`,
            [
                empresaId,
                titulo_puesto,
                descripcion_puesto,
                requisitos,
                beneficios,
                rango_salarial_min,
                rango_salarial_max,
                ubicacion_especifica,
                modalidad,
                categoria_id,
                fecha_vencimiento
            ]
        );

        res.status(201).json(nuevaVacante.rows[0]);

    } catch (error) {
        console.error('Error crearVacante:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Listar vacantes públicas
export const obtenerVacantes = async (req, res) => {
    try {
        const vacantes = await pool.query(`
            SELECT 
                v.*, 
                e.razon_social,
                e.nombre_comercial,
                COALESCE(e.nombre_comercial, e.razon_social) AS empresa_nombre, 
                e.url_logo AS empresa_logo,
                e.ubicacion_sede
            FROM vacantes v
            JOIN empresas e ON v.empresa_id = e.id
            WHERE v.estado = 'PUBLICADA'
            ORDER BY v.creado_el DESC
        `);

        res.json(vacantes.rows);

    } catch (error) {
        console.error('Error obtenerVacantes:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Editar vacante
export const editarVacante = async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        const { id } = req.params;

        const empresa = await pool.query(
            'SELECT id FROM empresas WHERE usuario_id = $1',
            [usuarioId]
        );

        if (empresa.rows.length === 0) {
            return res.status(400).json({ error: 'Empresa no encontrada' });
        }

        const empresaId = empresa.rows[0].id;

        const vacante = await pool.query(
            'SELECT * FROM vacantes WHERE id = $1 AND empresa_id = $2',
            [id, empresaId]
        );

        if (vacante.rows.length === 0) {
            return res.status(403).json({ error: 'No tienes permiso para editar esta vacante' });
        }

        const {
            titulo_puesto,
            descripcion_puesto,
            requisitos,
            beneficios
        } = req.body;

        const actualizado = await pool.query(
            `UPDATE vacantes SET 
            titulo_puesto=$1,
            descripcion_puesto=$2,
            requisitos=$3,
            beneficios=$4,
            actualizado_el=NOW()
            WHERE id=$5
            RETURNING *`,
            [titulo_puesto, descripcion_puesto, requisitos, beneficios, id]
        );

        res.json(actualizado.rows[0]);

    } catch (error) {
        console.error('Error editarVacante:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Cerrar vacante
export const cerrarVacante = async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        const { id } = req.params;

        const empresa = await pool.query(
            'SELECT id FROM empresas WHERE usuario_id = $1',
            [usuarioId]
        );

        const empresaId = empresa.rows[0]?.id;

        const vacante = await pool.query(
            'SELECT * FROM vacantes WHERE id = $1 AND empresa_id = $2',
            [id, empresaId]
        );

        if (vacante.rows.length === 0) {
            return res.status(403).json({ error: 'No tienes permiso para cerrar esta vacante' });
        }

        await pool.query(
            "UPDATE vacantes SET estado = 'FINALIZADA' WHERE id = $1",
            [id]
        );

        res.json({ mensaje: 'Vacante cerrada correctamente' });

    } catch (error) {
        console.error('Error cerrarVacante:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

export const actualizarVacante = async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        const { id } = req.params;
        const { 
            titulo_puesto, modalidad, descripcion_puesto, 
            requisitos, rango_salarial_min, rango_salarial_max, 
            ubicacion_especifica, beneficios 
        } = req.body;

        // Validar que el usuario tenga un perfil de empresa
        const empresa = await pool.query('SELECT id FROM empresas WHERE usuario_id = $1', [usuarioId]);
        if (empresa.rows.length === 0) {
            return res.status(403).json({ error: 'Perfil de empresa no encontrado' });
        }
        const empresaId = empresa.rows[0].id;

        // Actualizar la vacante en PostgreSQL
        const resultado = await pool.query(
            `UPDATE vacantes 
             SET titulo_puesto = $1, modalidad = $2, descripcion_puesto = $3, 
                 requisitos = $4, rango_salarial_min = $5, rango_salarial_max = $6, 
                 ubicacion_especifica = $7, beneficios = $8
             WHERE id = $9 AND empresa_id = $10
             RETURNING *`,
            [
                titulo_puesto, modalidad, descripcion_puesto, requisitos, 
                rango_salarial_min || null, rango_salarial_max || null, 
                ubicacion_especifica, beneficios, id, empresaId
            ]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({ error: 'Vacante no encontrada o no tienes permisos para editarla' });
        }

        res.json({ mensaje: 'Vacante actualizada correctamente', vacante: resultado.rows[0] });
    } catch (error) {
        console.error('Error en actualizarVacante:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

export const eliminarVacante = async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        const { id } = req.params;

        // Validar que el usuario tenga un perfil de empresa
        const empresa = await pool.query('SELECT id FROM empresas WHERE usuario_id = $1', [usuarioId]);
        if (empresa.rows.length === 0) {
            return res.status(403).json({ error: 'Perfil de empresa no encontrado' });
        }
        const empresaId = empresa.rows[0].id;

        // Eliminar la vacante (Solo si pertenece a esa empresa)
        const resultado = await pool.query(
            'DELETE FROM vacantes WHERE id = $1 AND empresa_id = $2 RETURNING id',
            [id, empresaId]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({ error: 'Vacante no encontrada o no tienes permisos' });
        }

        res.json({ mensaje: 'Vacante eliminada correctamente' });
    } catch (error) {
        console.error('Error en eliminarVacante:', error);
        if (error.code === '23503') {
            return res.status(400).json({ error: 'No puedes eliminar una vacante que ya tiene candidatos postulados.' });
        }
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Obtener solo las vacantes de la empresa autenticada
export const obtenerMisVacantes = async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        const rol = req.usuario.rol;

        if (rol !== 'EMPRESA') {
            return res.status(403).json({ error: 'Solo empresas pueden ver sus vacantes' });
        }

        const empresa = await pool.query(
            'SELECT id FROM empresas WHERE usuario_id = $1',
            [usuarioId]
        );

        if (empresa.rows.length === 0) {
            return res.status(400).json({ error: 'No tienes una empresa registrada' });
        }

        const empresaId = empresa.rows[0].id;

        const vacantes = await pool.query(
            `SELECT * FROM vacantes 
             WHERE empresa_id = $1 
             ORDER BY creado_el DESC`,
            [empresaId]
        );

        res.json(vacantes.rows);

    } catch (error) {
        console.error('Error obtenerMisVacantes:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

export const obtenerDetalleVacanteFull = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT v.*, e.razon_social, e.nombre_comercial, e.sitio_web, e.descripcion_empresa, e.url_logo, e.ubicacion_sede
            FROM vacantes v
            JOIN empresas e ON v.empresa_id = e.id
            WHERE v.id = $1
        `, [id]);

        if (result.rows.length === 0) return res.status(404).json({ error: 'Vacante no encontrada' });
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error de servidor' });
    }
};