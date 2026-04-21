import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

import express from 'express';
import cors from 'cors';
import { pool } from './db.js';

import authRoutes from './routes/auth.routes.js';
import candidatosRoutes from './routes/candidato.routes.js';
import empresasRoutes from './routes/empresas.routes.js';
import vacantesRoutes from './routes/vacantes.js';
import postulacionesRoutes from './routes/postulaciones.routes.js';
import forosRoutes from './routes/foros.routes.js';
import recursosRoutes from './routes/recursos.routes.js';
import adminRoutes from './routes/admin.routes.js';

const app = express();
app.use(cors());
app.use(express.json());

// Rutas
app.use('/api', authRoutes);
app.use('/api/candidatos', candidatosRoutes);
app.use('/api/empresas', empresasRoutes);
app.use('/api/vacantes', vacantesRoutes);
app.use('/api/postulaciones', postulacionesRoutes);
app.use('/api/foros', forosRoutes);
app.use('/api/recursos', recursosRoutes);
app.use('/api/admin', adminRoutes);

// Ruta base
app.get('/', (req, res) => {
    res.send('Servidor funcionando.');
});

app.listen(process.env.PORT || 3000, () => {
    console.log(`Servidor corriendo en http://localhost:${process.env.PORT || 3000}`);
});