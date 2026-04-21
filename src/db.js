import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

export const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
})

pool.connect()
    .then(() => console.log('Conexion exitosa a la DB.'))
    .catch(err => console.error('Error conectando la DB', err.stack));