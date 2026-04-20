import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

import express from 'express';
import { pool } from './db.js';

import authRoutes from './routes/auth.js';
import candidatosRoutes from './routes/candidato.js';
import empresasRoutes from './routes/empresas.routes.js';
import vacantesRoutes from './routes/vacantes.js';
import adminRoutes from './routes/admin.routes.js';
import categoriasRoutes from './routes/categorias.routes.js';

const app = express(); 
app.use(express.json());

// Rutas
app.use('/api', authRoutes);
app.use('/api/candidatos', candidatosRoutes);
app.use('/api/empresas', empresasRoutes);
app.use('/api/vacantes', vacantesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/categorias', categoriasRoutes);

// Ruta base
app.get('/', (req, res) => {
    res.send('Servidor funcionando.');
});

app.listen(process.env.PORT || 3000, () => {
    console.log(`Servidor corriendo en http://localhost:${process.env.PORT || 3000}`);
});