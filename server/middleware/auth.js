'use strict';

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'folio-dev-secret-change-me';

function signToken(user) {
    return jwt.sign(
        { id: user.id, email: user.email, role: user.role, name: user.name },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
}

function verifyToken(token) {
    return jwt.verify(token, JWT_SECRET);
}

function requireAuth(req, res, next) {
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Token requerido' });
    try {
        req.user = verifyToken(token);
        next();
    } catch (e) {
        return res.status(401).json({ error: 'Token inválido o expirado' });
    }
}

function requireRole(...allowed) {
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ error: 'No autenticado' });
        if (!allowed.includes(req.user.role)) {
            return res.status(403).json({ error: 'Acceso denegado para tu rol' });
        }
        next();
    };
}

module.exports = { signToken, verifyToken, requireAuth, requireRole, JWT_SECRET };