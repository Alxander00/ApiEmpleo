import { pool } from '../db.js';

// Ver todos los usuarios
export const obtenerUsuarios = async (req, res) => {
    try {
        if (req.usuario.rol !== 'ADMINISTRADOR') {
            return res.status(403).json({ error: 'Acceso solo para administradores' });
        }

        const usuarios = await pool.query(
            'SELECT id, correo_electronico, rol, estado FROM usuarios'
        );

        res.json(usuarios.rows);

    } catch (error) {
        console.error('Error obtenerUsuarios:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Suspender usuario
export const suspenderUsuario = async (req, res) => {
    try {
        if (req.usuario.rol !== 'ADMINISTRADOR') {
            return res.status(403).json({ error: 'Acceso solo para administradores' });
        }

        const { id } = req.params;

        await pool.query(
            "UPDATE usuarios SET estado = 'SUSPENDIDO' WHERE id = $1",
            [id]
        );

        res.json({ mensaje: 'Usuario suspendido correctamente' });

    } catch (error) {
        console.error('Error suspenderUsuario:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Verificar empresa
export const verificarEmpresa = async (req, res) => {
    try {
        if (req.usuario.rol !== 'ADMINISTRADOR') {
            return res.status(403).json({ error: 'Acceso solo para administradores' });
        }

        const { id } = req.params;

        await pool.query(
            "UPDATE empresas SET verificada = true WHERE id = $1",
            [id]
        );

        res.json({ mensaje: 'Empresa verificada correctamente' });

    } catch (error) {
        console.error('Error verificarEmpresa:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

export const obtenerMetricasDashboard = async (req, res) => {
    try {
        // Ejecutamos todas las consultas a la vez para optimizar tiempos de respuesta
        const [usuarios, vacantes, postulaciones, recursos] = await Promise.all([
            pool.query('SELECT COUNT(*) FROM usuarios'),
            pool.query("SELECT COUNT(*) FROM vacantes WHERE estado = 'PUBLICADA'"),
            pool.query('SELECT COUNT(*) FROM postulaciones'),
            pool.query('SELECT COUNT(*) FROM recursos')
        ]);

        // Retornamos el JSON formateado para que el frontend lo consuma fácil
        res.json({
            totalUsuarios: parseInt(usuarios.rows[0].count),
            vacantesActivas: parseInt(vacantes.rows[0].count),
            totalPostulaciones: parseInt(postulaciones.rows[0].count),
            totalRecursos: parseInt(recursos.rows[0].count)
        });

    } catch (error) {
        console.error("Error cargando métricas reales:", error.message);
        res.status(500).json({ error: "Error al conectar con las métricas de la DB" });
    }
};

// Gestionar Vacantes (CORREGIDO)
export const obtenerTodasVacantes = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT v.id, v.titulo_puesto, v.estado, v.modalidad, 
                   COALESCE(e.nombre_comercial, e.razon_social, 'Empresa Desconocida') as nombre_empresa
            FROM vacantes v 
            LEFT JOIN empresas e ON v.empresa_id = e.id 
            ORDER BY v.creado_el DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error("Error SQL en vacantes:", error.message); 
        res.status(500).json({ error: "Error al obtener vacantes de la BD" });
    }
};

export const eliminarVacante = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM vacantes WHERE id = $1', [id]);
        res.json({ mensaje: "Vacante eliminada" });
    } catch (error) {
        res.status(500).json({ error: "Error al eliminar vacante" });
    }
};

// Gestionar Foro
export const obtenerPostsForo = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT f.*, u.correo_electronico 
            FROM foros f 
            LEFT JOIN usuarios u ON f.usuario_id = u.id 
            ORDER BY f.creado_el DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error("Error SQL en foro:", error.message);
        res.status(500).json({ error: "Error al obtener posts del foro" });
    }
};

// Activar usuario
export const activarUsuario = async (req, res) => {
    try {
        if (req.usuario.rol !== 'ADMINISTRADOR') {
            return res.status(403).json({ error: 'Acceso solo para administradores' });
        }
        const { id } = req.params;
        await pool.query("UPDATE usuarios SET estado = 'ACTIVO' WHERE id = $1", [id]);
        res.json({ mensaje: 'Usuario activado correctamente' });
    } catch (error) {
        console.error("Error al activar usuario:", error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

export const crearRecurso = async (req, res) => {
    try {
        if (req.usuario.rol !== 'ADMINISTRADOR') return res.status(403).json({ error: 'Acceso denegado' });

        const { titulo, tipo, autor, tiempo_lectura, imagen_url, resumen, contenido } = req.body;

        const result = await pool.query(`
            INSERT INTO recursos (titulo, tipo, autor, tiempo_lectura, imagen_url, resumen, contenido)
            VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
        `, [titulo, tipo, autor, tiempo_lectura, imagen_url, resumen, contenido]);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error("Error al crear recurso:", error.message);
        res.status(500).json({ error: "Error interno al guardar en BD" });
    }
};

