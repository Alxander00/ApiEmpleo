import jwt from 'jsonwebtoken';

export const verificarToken = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(403).json({ error: 'Acceso denegado. Token no proporcionado.' });
        }

        const token = authHeader.split(' ')[1];

        const payload = jwt.verify(token, process.env.JWT_SECRET);

        req.usuario = payload;

        next(); 

    } catch (error) {
        return res.status(401).json({ error: 'Token inválido o expirado.' });
    }
};