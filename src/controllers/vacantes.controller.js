import { pool } from '../db.js';
import { Resend } from 'resend';

// Inicializar Resend con la API Key desde variables de entorno
const resend = new Resend(process.env.RESEND_API_KEY);

// Función auxiliar para enviar correos (evita repetir código)
const enviarNotificacionVacante = async (destinatarios, tituloVacante, nombreEmpresa, mensajePersonalizado) => {
    try {
        await resend.emails.send({
            from: 'EmpleoYa <onboarding@resend.dev>',
            to: destinatarios,
            subject: `Actualización de vacante: ${tituloVacante}`,
            html: `
                <div style="font-family: Arial, sans-serif; color: #333;">
                    <h2>Hola,</h2>
                    <p>La vacante <strong>${tituloVacante}</strong> de la empresa <strong>${nombreEmpresa}</strong> ha cambiado su estado.</p>
                    <p>${mensajePersonalizado}</p>
                    <br>
                    <p>Saludos,<br>Equipo de EmpleoYa</p>
                </div>
            `
        });
        console.log(`✉️ Correo enviado a: ${destinatarios.join(', ')}`);
    } catch (error) {
        console.error('Error al enviar notificación por correo:', error);
    }
};

// Crear vacante (sin cambios, solo incluido por completitud)
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
            rango_salarial_min, rango_salarial_max, ubicacion_especifica, modalidad, categoria_id, fecha_vencimiento, estado)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, 'ACTIVA')
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

// Listar vacantes públicas (sin cambios)
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
            JOIN usuarios u ON e.usuario_id = u.id 
            WHERE (v.estado != 'INACTIVA' OR v.estado IS NULL)
              AND u.estado != 'SUSPENDIDO'
            ORDER BY v.creado_el DESC
        `);

        res.json(vacantes.rows);

    } catch (error) {
        console.error('Error obtenerVacantes:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Editar vacante (sin cambios)
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

// Cerrar vacante (con notificación por correo)
export const cerrarVacante = async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        const { id } = req.params;

        // Obtener la empresa del usuario y su correo electrónico
        const empresaData = await pool.query(
            `SELECT e.id, u.correo_electronico AS empresa_email, 
                    COALESCE(e.nombre_comercial, e.razon_social) AS nombre_empresa
             FROM empresas e
             JOIN usuarios u ON e.usuario_id = u.id
             WHERE e.usuario_id = $1`,
            [usuarioId]
        );

        if (empresaData.rows.length === 0) {
            return res.status(403).json({ error: 'No tienes una empresa registrada' });
        }

        const empresaId = empresaData.rows[0].id;
        const empresaEmail = empresaData.rows[0].empresa_email;
        const nombreEmpresa = empresaData.rows[0].nombre_empresa;

        // Verificar que la vacante pertenece a esta empresa
        const vacante = await pool.query(
            'SELECT titulo_puesto FROM vacantes WHERE id = $1 AND empresa_id = $2',
            [id, empresaId]
        );

        if (vacante.rows.length === 0) {
            return res.status(403).json({ error: 'No tienes permiso para cerrar esta vacante' });
        }

        const tituloVacante = vacante.rows[0].titulo_puesto;

        // Actualizar estado a 'FINALIZADA'
        await pool.query(
            "UPDATE vacantes SET estado = 'FINALIZADA' WHERE id = $1",
            [id]
        );

        // --- ENVIAR CORREOS ---
        const destinatarios = [empresaEmail];
        if (process.env.ADMIN_EMAIL) {
            destinatarios.push(process.env.ADMIN_EMAIL);
        }
        const mensaje = `La vacante ha sido cerrada y ya no recibirá más postulaciones.`;

        await enviarNotificacionVacante(destinatarios, tituloVacante, nombreEmpresa, mensaje);

        res.json({ mensaje: 'Vacante cerrada correctamente' });

    } catch (error) {
        console.error('Error cerrarVacante:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Actualizar vacante (sin cambios)
export const actualizarVacante = async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        const { id } = req.params;
        const { 
            titulo_puesto, modalidad, descripcion_puesto, 
            requisitos, rango_salarial_min, rango_salarial_max, 
            ubicacion_especifica, beneficios 
        } = req.body;

        const empresa = await pool.query('SELECT id FROM empresas WHERE usuario_id = $1', [usuarioId]);
        if (empresa.rows.length === 0) {
            return res.status(403).json({ error: 'Perfil de empresa no encontrado' });
        }
        const empresaId = empresa.rows[0].id;

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

// Eliminar vacante (sin cambios)
export const eliminarVacante = async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        const { id } = req.params;

        const empresa = await pool.query('SELECT id FROM empresas WHERE usuario_id = $1', [usuarioId]);
        if (empresa.rows.length === 0) {
            return res.status(403).json({ error: 'Perfil de empresa no encontrado' });
        }
        const empresaId = empresa.rows[0].id;

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

// Obtener solo las vacantes de la empresa autenticada (sin cambios)
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

// Obtener detalle completo de una vacante (público)
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

// Cambiar el estado de la vacante (Activa / Inactiva) con validación de postulaciones
export const cambiarEstadoVacante = async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        const { id } = req.params;
        const { estado } = req.body; 

        // Validar que el estado sea válido (ACTIVA o INACTIVA)
        if (!['ACTIVA', 'INACTIVA'].includes(estado)) {
            return res.status(400).json({ error: 'Estado no válido. Use ACTIVA o INACTIVA' });
        }

        // Obtener la empresa y su correo, además de verificar que no esté suspendida
        const empresaData = await pool.query(`
            SELECT e.id, u.correo_electronico AS empresa_email, u.estado AS estado_usuario,
                   COALESCE(e.nombre_comercial, e.razon_social) AS nombre_empresa
            FROM empresas e
            JOIN usuarios u ON e.usuario_id = u.id
            WHERE e.usuario_id = $1
        `, [usuarioId]);

        if (empresaData.rows.length === 0) {
            return res.status(403).json({ error: 'Perfil de empresa no encontrado' });
        }

        if (empresaData.rows[0].estado_usuario === 'SUSPENDIDO') {
            return res.status(403).json({ error: 'Tu cuenta ha sido suspendida. No puedes modificar vacantes.' });
        }

        const empresaId = empresaData.rows[0].id;
        const empresaEmail = empresaData.rows[0].empresa_email;
        const nombreEmpresa = empresaData.rows[0].nombre_empresa;

        // Obtener la vacante actual
        const vacanteActual = await pool.query(
            'SELECT titulo_puesto, estado FROM vacantes WHERE id = $1 AND empresa_id = $2',
            [id, empresaId]
        );
        if (vacanteActual.rows.length === 0) {
            return res.status(404).json({ error: 'Vacante no encontrada o no tienes permisos' });
        }
        const tituloVacante = vacanteActual.rows[0].titulo_puesto;
        const estadoActual = vacanteActual.rows[0].estado;

        // Validación 1: No se puede cambiar si la vacante ya está FINALIZADA (cerrada)
        if (estadoActual === 'FINALIZADA') {
            return res.status(400).json({ error: 'No se puede cambiar el estado de una vacante que ya fue cerrada.' });
        }

        // Validación 2: Si se intenta poner INACTIVA, verificar si tiene postulaciones
        if (estado === 'INACTIVA') {
            const postulacionesCount = await pool.query(
                `SELECT COUNT(*) FROM postulaciones p
                 JOIN vacantes v ON p.vacante_id = v.id
                 WHERE v.id = $1`,
                [id]
            );
            const totalPostulaciones = parseInt(postulacionesCount.rows[0].count);
            if (totalPostulaciones > 0) {
                return res.status(400).json({ 
                    error: 'No puedes desactivar esta vacante porque ya tiene postulaciones activas. Cierra la vacante en su lugar.' 
                });
            }
        }

        // Actualizar el estado
        const resultado = await pool.query(
            'UPDATE vacantes SET estado = $1 WHERE id = $2 AND empresa_id = $3 RETURNING *',
            [estado, id, empresaId]
        );

        // --- ENVIAR CORREOS ---
        const destinatarios = [empresaEmail];
        if (process.env.ADMIN_EMAIL) {
            destinatarios.push(process.env.ADMIN_EMAIL);
        }
        const mensaje = `La vacante ha cambiado su estado a: <strong>${estado}</strong>.`;

        await enviarNotificacionVacante(destinatarios, tituloVacante, nombreEmpresa, mensaje);

        res.json({ mensaje: 'Estado de la vacante actualizado', vacante: resultado.rows[0] });

    } catch (error) {
        console.error('Error en cambiarEstadoVacante:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};