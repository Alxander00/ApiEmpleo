import { pool } from '../db.js';

// 🔹 Crear vacante
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

// 🔹 Listar vacantes públicas
export const obtenerVacantes = async (req, res) => {
    try {
        const vacantes = await pool.query(
            "SELECT * FROM vacantes WHERE estado = 'PUBLICADA'"
        );

        res.json(vacantes.rows);

    } catch (error) {
        console.error('Error obtenerVacantes:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// 🔹 Editar vacante
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

// 🔹 Cerrar vacante
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