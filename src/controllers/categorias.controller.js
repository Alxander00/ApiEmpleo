import { pool } from '../db.js';

// 🔹 Obtener todas las categorías
export const obtenerCategorias = async (req, res) => {
    try {
        const categorias = await pool.query(
            'SELECT id, nombre, descripcion FROM categorias_empleo WHERE activo = true'
        );

        res.json(categorias.rows);

    } catch (error) {
        console.error('Error obtenerCategorias:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// 🔹 Obtener una categoría por ID (opcional pero pro)
export const obtenerCategoriaPorId = async (req, res) => {
    try {
        const { id } = req.params;

        const categoria = await pool.query(
            'SELECT id, nombre, descripcion FROM categorias_empleo WHERE id = $1',
            [id]
        );

        if (categoria.rows.length === 0) {
            return res.status(404).json({ error: 'Categoría no encontrada' });
        }

        res.json(categoria.rows[0]);

    } catch (error) {
        console.error('Error obtenerCategoriaPorId:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};