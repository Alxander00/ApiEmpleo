import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

import express from 'express';
import { pool } from './db.js';

import authRoutes from './routes/auth.js';
import candidatosRoutes from './routes/candidato.js';
import vacantesRoutes from './routes/vacantes.js';
import adminRoutes from './routes/admin.routes.js';

const app = express(); 
app.use(express.json());

// Rutas
app.use('/api', authRoutes);
app.use('/api/candidatos', candidatosRoutes);
app.use('/api/vacantes', vacantesRoutes);
app.use('/api/admin', adminRoutes);

// Ruta base
app.get('/', (req, res) => {
    res.send('Servidor funcionando.');
});

app.listen(process.env.PORT || 3000, () => {
    console.log(`Servidor corriendo en http://localhost:${process.env.PORT || 3000}`);
});