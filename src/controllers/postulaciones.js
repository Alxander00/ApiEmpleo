import { pool } from '../db.js';

// POST /api/postulaciones - Un candidato aplica a una vacante
export const postularVacante = async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        const usuarioRol = req.usuario.rol;
        const { vacanteId } = req.body;

        // 1. Validar rol y datos obligatorios
        if (usuarioRol !== 'CANDIDATO') {
            return res.status(403).json({ error: 'Solo los candidatos pueden postularse a vacantes' });
        }

        if (!vacanteId) {
            return res.status(400).json({ error: 'El ID de la vacante es obligatorio' });
        }

        // 2. Verificar que el candidato tenga perfil creado
        const perfilCandidato = await pool.query(
            'SELECT id FROM candidatos WHERE usuario_id = $1',
            [usuarioId]
        );

        if (perfilCandidato.rows.length === 0) {
            return res.status(400).json({ error: 'Debes completar tu perfil de candidato antes de postularte' });
        }

        const candidatoId = perfilCandidato.rows[0].id;

        // 3. Verificar que la vacante exista y esté publicada
        const vacante = await pool.query(
            `SELECT id, estado, fecha_vencimiento 
             FROM vacantes 
             WHERE id = $1`,
            [vacanteId]
        );

        if (vacante.rows.length === 0) {
            return res.status(404).json({ error: 'La vacante no existe' });
        }

        const estadoVacante = vacante.rows[0].estado;
        const fechaVenc = vacante.rows[0].fecha_vencimiento;

        if (estadoVacante !== 'PUBLICADA') {
            return res.status(400).json({ error: 'Esta vacante no está disponible para postulaciones' });
        }

        if (fechaVenc && new Date(fechaVenc) < new Date()) {
            return res.status(400).json({ error: 'La vacante ha expirado' });
        }

        // 4. Intentar insertar (la restricción UNIQUE evitará duplicados)
        try {
            const nuevaPostulacion = await pool.query(
                `INSERT INTO postulaciones (vacante_id, candidato_id, etapa_actual)
                 VALUES ($1, $2, 'RECIBIDA')
                 RETURNING id, vacante_id, candidato_id, etapa_actual, fecha_postulacion`,
                [vacanteId, candidatoId]
            );

            res.status(201).json({
                mensaje: 'Postulación enviada exitosamente',
                postulacion: nuevaPostulacion.rows[0]
            });

        } catch (error) {
            // Violación de UNIQUE (ya postulado)
            if (error.code === '23505') {
                return res.status(409).json({ error: 'Ya te has postulado a esta vacante anteriormente' });
            }
            throw error;
        }

    } catch (error) {
        console.error('Error en postularVacante:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// GET /api/postulaciones/vacante/:vacanteId/postulantes - Empresa ve postulantes de su vacante
export const obtenerPostulantesPorVacante = async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        const usuarioRol = req.usuario.rol;
        const { vacanteId } = req.params;

        // 1. Solo empresas
        if (usuarioRol !== 'EMPRESA') {
            return res.status(403).json({ error: 'Acceso restringido a empresas' });
        }

        // 2. Verificar que la empresa del usuario existe
        const empresa = await pool.query(
            'SELECT id FROM empresas WHERE usuario_id = $1',
            [usuarioId]
        );

        if (empresa.rows.length === 0) {
            return res.status(403).json({ error: 'No tienes un perfil de empresa asociado' });
        }

        const empresaId = empresa.rows[0].id;

        // 3. Verificar que la vacante pertenece a esta empresa
        const vacante = await pool.query(
            `SELECT id, titulo_puesto 
             FROM vacantes 
             WHERE id = $1 AND empresa_id = $2`,
            [vacanteId, empresaId]
        );

        if (vacante.rows.length === 0) {
            return res.status(404).json({ error: 'Vacante no encontrada o no pertenece a tu empresa' });
        }

        // 4. Obtener lista de postulantes con información básica del candidato
        const postulantes = await pool.query(
            `SELECT 
                p.id AS postulacion_id,
                p.etapa_actual,
                p.fecha_postulacion,
                p.comentarios_reclutador,
                c.id AS candidato_id,
                c.nombres,
                c.apellidos,
                c.titular_profesional,
                c.url_curriculum_pdf,
                c.telefono_contacto
             FROM postulaciones p
             INNER JOIN candidatos c ON p.candidato_id = c.id
             WHERE p.vacante_id = $1
             ORDER BY p.fecha_postulacion DESC`,
            [vacanteId]
        );

        res.json({
            vacante: {
                id: vacante.rows[0].id,
                titulo: vacante.rows[0].titulo_puesto
            },
            total_postulantes: postulantes.rows.length,
            postulantes: postulantes.rows
        });

    } catch (error) {
        console.error('Error en obtenerPostulantesPorVacante:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};