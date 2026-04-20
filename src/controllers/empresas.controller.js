import { pool } from '../db.js';

// Crear o actualizar perfil de empresa
export const guardarMiEmpresa = async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        const rol = req.usuario.rol;

        if (rol !== 'EMPRESA') {
            return res.status(403).json({
                error: 'Solo los usuarios con rol EMPRESA pueden registrar una empresa.'
            });
        }

        const {
            razon_social,
            nombre_comercial,
            nit_o_registro,
            sitio_web,
            descripcion_empresa,
            url_logo,
            ubicacion_sede
        } = req.body;

        if (!razon_social || !ubicacion_sede) {
            return res.status(400).json({
                error: 'Los campos razon_social y ubicacion_sede son obligatorios.'
            });
        }

        const empresaExistente = await pool.query(
            'SELECT id FROM empresas WHERE usuario_id = $1',
            [usuarioId]
        );

        let resultado;

        if (empresaExistente.rows.length > 0) {
            resultado = await pool.query(
                `UPDATE empresas
                 SET razon_social = $1,
                     nombre_comercial = $2,
                     nit_o_registro = $3,
                     sitio_web = $4,
                     descripcion_empresa = $5,
                     url_logo = $6,
                     ubicacion_sede = $7,
                     actualizado_el = CURRENT_TIMESTAMP
                 WHERE usuario_id = $8
                 RETURNING *`,
                [
                    razon_social,
                    nombre_comercial || null,
                    nit_o_registro || null,
                    sitio_web || null,
                    descripcion_empresa || null,
                    url_logo || null,
                    ubicacion_sede,
                    usuarioId
                ]
            );

            return res.status(200).json({
                mensaje: 'Empresa actualizada correctamente.',
                empresa: resultado.rows[0]
            });
        }

        resultado = await pool.query(
            `INSERT INTO empresas
            (
                usuario_id,
                razon_social,
                nombre_comercial,
                nit_o_registro,
                sitio_web,
                descripcion_empresa,
                url_logo,
                ubicacion_sede
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
            RETURNING *`,
            [
                usuarioId,
                razon_social,
                nombre_comercial || null,
                nit_o_registro || null,
                sitio_web || null,
                descripcion_empresa || null,
                url_logo || null,
                ubicacion_sede
            ]
        );

        res.status(201).json({
            mensaje: 'Empresa registrada correctamente.',
            empresa: resultado.rows[0]
        });

    } catch (error) {
        console.error('Error en guardarMiEmpresa:', error);

        if (error.code === '23505') {
            return res.status(400).json({
                error: 'Ya existe una empresa con ese NIT o registro.'
            });
        }

        res.status(500).json({
            error: 'Error interno del servidor.'
        });
    }
};

// Obtener la empresa del usuario autenticado
export const obtenerMiEmpresa = async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        const rol = req.usuario.rol;

        if (rol !== 'EMPRESA') {
            return res.status(403).json({
                error: 'Solo los usuarios con rol EMPRESA pueden ver esta información.'
            });
        }

        const resultado = await pool.query(
            `SELECT 
                e.*,
                u.correo_electronico
             FROM empresas e
             INNER JOIN usuarios u ON e.usuario_id = u.id
             WHERE e.usuario_id = $1`,
            [usuarioId]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                error: 'No se encontró una empresa asociada a este usuario.'
            });
        }

        res.status(200).json(resultado.rows[0]);

    } catch (error) {
        console.error('Error en obtenerMiEmpresa:', error);
        res.status(500).json({
            error: 'Error interno del servidor.'
        });
    }
};

// Listado público de empresas
export const listarEmpresas = async (req, res) => {
    try {
        const resultado = await pool.query(
            `SELECT
                id,
                razon_social,
                nombre_comercial,
                sitio_web,
                descripcion_empresa,
                url_logo,
                ubicacion_sede,
                verificada,
                actualizado_el
             FROM empresas
             ORDER BY actualizado_el DESC`
        );

        res.status(200).json(resultado.rows);

    } catch (error) {
        console.error('Error en listarEmpresas:', error);
        res.status(500).json({
            error: 'Error interno del servidor.'
        });
    }
};