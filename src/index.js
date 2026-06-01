import 'dotenv/config'; 

import express from 'express';
import cors from 'cors';
import { pool } from './db.js';

// Importación de Rutas
import authRoutes from './routes/auth.routes.js';
import candidatosRoutes from './routes/candidato.routes.js';
import empresasRoutes from './routes/empresas.routes.js';
import vacantesRoutes from './routes/vacantes.js';
import postulacionesRoutes from './routes/postulaciones.routes.js';
import forosRoutes from './routes/foros.routes.js';
import recursosRoutes from './routes/recursos.routes.js';
import adminRoutes from './routes/admin.routes.js';

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Verificación de carga de variables (Solo para depurar, puedes borrarlo luego)
console.log("Estado de JWT_SECRET:", process.env.JWT_SECRET ? "Cargada ✅" : "No encontrada ❌");

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

import { Resend } from 'resend';
app.get('/test-email', async (req, res) => {
  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    const { data, error } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'alextejada025@gmail.com',
      subject: 'Prueba EmpleoYa',
      html: '<strong>Funciona!</strong>'
    });
    if (error) throw error;
    res.send('Correo enviado');
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});

// Inicio del servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});