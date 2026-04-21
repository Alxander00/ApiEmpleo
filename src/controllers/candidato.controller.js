import { pool } from '../db.js';

export const crearPerfilCandidato = async (req, res) => {
    try {
        const usuarioId = req.usuario.id; 
        const { 
            nombres, apellidos, telefono_contacto, fecha_nacimiento, 
            titular_profesional, resumen_biografico, url_curriculum_pdf, 
            foto_perfil_url, habilidades_tecnicas 
        } = req.body;

        if (!nombres || !apellidos) {
            return res.status(400).json({ error: 'Nombres y apellidos son obligatorios' });
        }

        const habilidadesArr = Array.isArray(habilidades_tecnicas) 
            ? habilidades_tecnicas 
            : (habilidades_tecnicas ? habilidades_tecnicas.split(',').map(s => s.trim()) : []);

        const perfilExistente = await pool.query('SELECT id FROM candidatos WHERE usuario_id = $1', [usuarioId]);

        let resultado;
        if (perfilExistente.rows.length > 0) {
            // ACTUALIZACIÓN
            resultado = await pool.query(
                `UPDATE candidatos 
                 SET nombres = $1, apellidos = $2, telefono_contacto = $3, fecha_nacimiento = $4, 
                     titular_profesional = $5, resumen_biografico = $6, url_curriculum_pdf = $7, 
                     foto_perfil_url = $8, habilidades_tecnicas = $9, actualizado_el = CURRENT_TIMESTAMP
                 WHERE usuario_id = $10 RETURNING *`,
                [nombres, apellidos, telefono_contacto, fecha_nacimiento, titular_profesional, resumen_biografico, url_curriculum_pdf, foto_perfil_url, habilidadesArr, usuarioId]
            );
        } else {
            // CREACIÓN
            resultado = await pool.query(
                `INSERT INTO candidatos (usuario_id, nombres, apellidos, telefono_contacto, fecha_nacimiento, titular_profesional, resumen_biografico, url_curriculum_pdf, foto_perfil_url, habilidades_tecnicas) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
                [usuarioId, nombres, apellidos, telefono_contacto, fecha_nacimiento, titular_profesional, resumen_biografico, url_curriculum_pdf, foto_perfil_url, habilidadesArr]
            );
        }

        res.status(200).json({ mensaje: 'Perfil actualizado con éxito', perfil: resultado.rows[0] });
    } catch (error) {
        console.error('Error en crearPerfilCandidato:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

export const obtenerMiPerfil = async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        const resultado = await pool.query('SELECT * FROM candidatos WHERE usuario_id = $1', [usuarioId]);
        
        if (resultado.rows.length === 0) {
            return res.status(404).json({ error: 'Perfil no encontrado' });
        }
        res.json(resultado.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los datos del perfil' });
    }
};

export const registrarVistaPerfil = async (req, res) => {
    try {
        const { id } = req.params;
        const rol = req.usuario.rol;

        if (rol !== 'EMPRESA') {
            return res.status(403).json({ error: 'Solo las empresas pueden generar vistas al perfil' });
        }

        const resultado = await pool.query(
            `UPDATE candidatos 
             SET vistas_perfil = vistas_perfil + 1 
             WHERE id = $1 
             RETURNING vistas_perfil`,
            [id]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({ error: 'Candidato no encontrado' });
        }

        res.status(200).json({ 
            mensaje: 'Vista registrada exitosamente', 
            vistasTotales: resultado.rows[0].vistas_perfil 
        });

    } catch (error) {
        console.error('Error en registrarVistaPerfil:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};
export const obtenerCandidatoPorId = async (req, res) => {
    try {
        const { id } = req.params;
        const resultado = await pool.query(
            `SELECT c.*, u.correo_electronico 
             FROM candidatos c
             JOIN usuarios u ON c.usuario_id = u.id
             WHERE c.id = $1`,
            [id]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({ error: 'Candidato no encontrado' });
        }

        // Opcional: podrías omitir campos sensibles si lo deseas
        res.json(resultado.rows[0]);
    } catch (error) {
        console.error('Error en obtenerCandidatoPorId:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};