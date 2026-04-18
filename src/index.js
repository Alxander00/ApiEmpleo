import express, { json } from 'express';
import dotenv from 'dotenv';
import { pool } from './db.js';






import postulacionesRoutes from './routes/postulaciones.js';
import authRoutes from './routes/auth.js';
import candidatosRoutes from './routes/candidato.js';
dotenv.config();

const app = express();
app.use(express.json());

app.use('/api', authRoutes);
app.use('/api/candidatos', candidatosRoutes);
app.use('/api/postulaciones', postulacionesRoutes);

app.get('/', (req, res) => {
    res.send('Servidor funcionando.');
})

app.listen(process.env.PORT || 3000, () => {
    console.log(`Servidor corriendo en http://localhost:${process.env.PORT || 3000}`);
})