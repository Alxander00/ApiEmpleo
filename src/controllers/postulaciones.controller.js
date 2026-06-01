import { pool } from '../db.js';
import { Resend } from 'resend';

console.log("¿Tengo API Key cargada?:", process.env.RESEND_API_KEY ? "SÍ ✅" : "NO ❌");
const resend = new Resend(process.env.RESEND_API_KEY);

export const postularVacante = async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        const usuarioRol = req.usuario.rol;
        const { vacanteId } = req.body;

        if (usuarioRol !== 'CANDIDATO') {
            return res.status(403).json({ error: 'Solo los candidatos pueden postularse a vacantes' });
        }

        if (!vacanteId) {
            return res.status(400).json({ error: 'El ID de la vacante es obligatorio' });
        }

        const perfilCandidato = await pool.query(
            'SELECT id FROM candidatos WHERE usuario_id = $1',
            [usuarioId]
        );

        if (perfilCandidato.rows.length === 0) {
            return res.status(400).json({ error: 'Debes completar tu perfil de candidato antes de postularte' });
        }
        
        const candidatoId = perfilCandidato.rows[0].id;

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

        if (estadoVacante === 'INACTIVA' || estadoVacante === 'FINALIZADA') {
            return res.status(400).json({ error: 'Esta vacante no está disponible para postulaciones' });
        }

        if (fechaVenc && new Date(fechaVenc) < new Date()) {
            return res.status(400).json({ error: 'La vacante ha expirado' });
        }

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

export const obtenerPostulantesPorVacante = async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        const usuarioRol = req.usuario.rol;
        const { vacanteId } = req.params;

        if (usuarioRol !== 'EMPRESA') {
            return res.status(403).json({ error: 'Acceso restringido a empresas' });
        }

        const empresa = await pool.query(
            'SELECT id FROM empresas WHERE usuario_id = $1',
            [usuarioId]
        );

        if (empresa.rows.length === 0) {
            return res.status(403).json({ error: 'No tienes un perfil de empresa asociado' });
        }

        const empresaId = empresa.rows[0].id;

        const vacante = await pool.query(
            `SELECT id, titulo_puesto, estado 
             FROM vacantes 
             WHERE id = $1 AND empresa_id = $2`,
            [vacanteId, empresaId]
        );

        if (vacante.rows.length === 0) {
            return res.status(404).json({ error: 'Vacante no encontrada o no pertenece a tu empresa' });
        }

        const vacanteData = vacante.rows[0];

        // Validación: No mostrar postulantes si la vacante está INACTIVA o FINALIZADA
        if (vacanteData.estado === 'INACTIVA') {
            return res.status(403).json({ error: 'Esta vacante está inactiva. No puedes ver los postulantes.' });
        }
        if (vacanteData.estado === 'FINALIZADA') {
            return res.status(403).json({ error: 'Esta vacante ya está cerrada. No puedes ver los postulantes.' });
        }

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
                id: vacanteData.id,
                titulo: vacanteData.titulo_puesto,
                estado: vacanteData.estado
            },
            total_postulantes: postulantes.rows.length,
            postulantes: postulantes.rows
        });

    } catch (error) {
        console.error('Error en obtenerPostulantesPorVacante:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

export const actualizarEstadoPostulacion = async (req, res) => {
    try {
        const usuarioRol = req.usuario.rol;
        const usuarioId = req.usuario.id;
        const { id } = req.params; 
        const { etapa_actual } = req.body;

        if (usuarioRol !== 'EMPRESA') {
            return res.status(403).json({ error: 'Solo empresas pueden cambiar estados' });
        }

        if (!etapa_actual) {
            return res.status(400).json({ error: 'La etapa_actual es obligatoria' });
        }

        const estadoEmpresa = await pool.query(
            'SELECT estado FROM usuarios WHERE id = $1',
            [usuarioId]
        );

        if (estadoEmpresa.rows.length === 0 || estadoEmpresa.rows[0].estado === 'SUSPENDIDO') {
            return res.status(403).json({ error: 'Tu cuenta ha sido suspendida. No puedes gestionar postulantes.' });
        }

        // 🔍 Verificar el estado de la vacante asociada a esta postulación
        const infoVacante = await pool.query(`
            SELECT v.estado AS estado_vacante
            FROM postulaciones p
            JOIN vacantes v ON p.vacante_id = v.id
            WHERE p.id = $1
        `, [id]);

        if (infoVacante.rows.length === 0) {
            return res.status(404).json({ error: 'Postulación no encontrada' });
        }

        const estadoVacante = infoVacante.rows[0].estado_vacante;

        // ❌ No permitir cambios si la vacante está inactiva o finalizada
        if (estadoVacante === 'INACTIVA') {
            return res.status(403).json({ error: 'No puedes cambiar el estado de postulantes porque la vacante está inactiva.' });
        }
        if (estadoVacante === 'FINALIZADA') {
            return res.status(403).json({ error: 'No puedes cambiar el estado de postulantes porque la vacante ya está cerrada.' });
        }

        // Actualizar estado de la postulación
        const resultado = await pool.query(
            `UPDATE postulaciones 
             SET etapa_actual = $1 
             WHERE id = $2 
             RETURNING id, etapa_actual`,
            [etapa_actual, id]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({ error: 'Postulación no encontrada' });
        }

        // --- Envío de correo de notificación ---
        const infoCorreo = await pool.query(`
            SELECT 
                c.nombres AS candidato_nombre,
                u.correo_electronico AS candidato_email,
                v.titulo_puesto,
                e.nombre_comercial AS empresa_nombre
            FROM postulaciones p
            JOIN candidatos c ON p.candidato_id = c.id
            JOIN usuarios u ON c.usuario_id = u.id
            JOIN vacantes v ON p.vacante_id = v.id
            JOIN empresas e ON v.empresa_id = e.id
            WHERE p.id = $1
        `, [id]);

        if (infoCorreo.rows.length > 0) {
            const info = infoCorreo.rows[0];
            let asunto = '';
            let mensajeHtml = '';

            if (etapa_actual === 'ENTREVISTA') {
                asunto = `¡Buenas noticias de ${info.empresa_nombre}!`;
                mensajeHtml = `
                    <div style="font-family: Arial, sans-serif; color: #333;">
                        <h2 style="color: #0d6efd;">Hola ${info.candidato_nombre},</h2>
                        <p>Nos complace informarte que tu postulación para <strong>${info.titulo_puesto}</strong> ha avanzado a la fase de <strong>Entrevista</strong>.</p>
                        <p>El equipo de ${info.empresa_nombre} se pondrá en contacto contigo muy pronto para agendar los detalles.</p>
                        <br>
                        <p>Atentamente,<br><strong>El equipo de EmpleoYa</strong></p>
                    </div>
                `;
            } else if (etapa_actual === 'RECHAZADO') {
                asunto = `Actualización de tu postulación en ${info.empresa_nombre}`;
                mensajeHtml = `
                    <div style="font-family: Arial, sans-serif; color: #333;">
                        <h2>Hola ${info.candidato_nombre},</h2>
                        <p>Gracias por tu interés en la vacante de <strong>${info.titulo_puesto}</strong>.</p>
                        <p>En esta ocasión, la empresa ${info.empresa_nombre} ha decidido avanzar con otros perfiles que se alinean más a lo que buscan actualmente. ¡No te desanimes! Te invitamos a seguir aplicando a otras ofertas en nuestro portal.</p>
                        <br>
                        <p>Atentamente,<br><strong>El equipo de EmpleoYa</strong></p>
                    </div>
                `;
            } else if (etapa_actual === 'CONTRATADO') {
                asunto = `¡Felicidades! Has sido seleccionado por ${info.empresa_nombre}`;
                mensajeHtml = `
                    <div style="font-family: Arial, sans-serif; color: #333;">
                        <h2 style="color: #198754;">¡Felicidades ${info.candidato_nombre}! 🎉</h2>
                        <p>Tu proceso para <strong>${info.titulo_puesto}</strong> ha sido un éxito y has sido seleccionado para el puesto.</p>
                        <p>Prepárate para esta nueva aventura profesional.</p>
                        <br>
                        <p>Atentamente,<br><strong>El equipo de EmpleoYa</strong></p>
                    </div>
                `;
            }

            if (asunto !== '') {
                try {
                    await resend.emails.send({
                        from: 'EmpleoYa Notificaciones <onboarding@resend.dev>',
                        to: info.candidato_email,
                        subject: asunto,
                        html: mensajeHtml
                    });
                    console.log(`✉️ Correo enviado a ${info.candidato_email} - Estado: ${etapa_actual}`);
                } catch (emailError) {
                    console.error('Error al enviar el correo:', emailError);
                }
            }
        }

        res.json({ 
            mensaje: 'Estado actualizado correctamente', 
            postulacion: resultado.rows[0] 
        });

    } catch (error) {
        console.error('Error en actualizarEstadoPostulacion:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

export const obtenerMisPostulaciones = async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        if (req.usuario.rol !== 'CANDIDATO') return res.status(403).json({ error: 'Solo candidatos' });

        const candidato = await pool.query('SELECT id FROM candidatos WHERE usuario_id = $1', [usuarioId]);
        if (candidato.rows.length === 0) return res.status(404).json({ error: 'Perfil no encontrado' });

        const candidatoId = candidato.rows[0].id;

        const postulaciones = await pool.query(
            `SELECT p.id, p.etapa_actual, p.fecha_postulacion, 
                    v.titulo_puesto, v.modalidad, v.ubicacion_especifica,
                    CASE 
                        WHEN u_empresa.estado = 'SUSPENDIDO' THEN 'Empresa (Suspendida)'
                        ELSE COALESCE(e.nombre_comercial, e.razon_social)
                    END AS empresa
             FROM postulaciones p
             INNER JOIN vacantes v ON p.vacante_id = v.id
             INNER JOIN empresas e ON v.empresa_id = e.id
             INNER JOIN usuarios u_empresa ON e.usuario_id = u_empresa.id
             WHERE p.candidato_id = $1
             ORDER BY p.fecha_postulacion DESC`,
            [candidatoId]
        );

        res.json(postulaciones.rows);
    } catch (error) {
        console.error("Error al obtener mis postulaciones:", error);
        res.status(500).json({ error: "Error del servidor" });
    }
};