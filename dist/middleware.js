"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.requireRole = requireRole;
function requireAuth(req, res, next) {
    const session = req.session;
    if (!session || !session.user) {
        session.intendedUrl = req.originalUrl;
        req.flash('error', 'Vui lòng đăng nhập để tiếp tục.');
        return res.redirect('/login');
    }
    next();
}
/**
 * Role-Based Access Control Middleware
 * Supports single-role and multi-role users (checks session.user.roles or session.user.role)
 */
function requireRole(...roles) {
    return (req, res, next) => {
        const session = req.session;
        if (!session || !session.user) {
            session.intendedUrl = req.originalUrl;
            req.flash('error', 'Vui lòng đăng nhập để tiếp tục.');
            return res.redirect('/login');
        }
        const user = session.user;
        const userRoles = Array.isArray(user.roles) && user.roles.length > 0
            ? user.roles
            : [user.role || 'patient'];
        // Check if the user has at least one of the required roles
        const hasRole = roles.some(r => userRoles.includes(r));
        if (!hasRole) {
            req.flash('error', 'Bạn không có quyền truy cập trang này.');
            res.status(403).redirect('/');
            return;
        }
        next();
    };
}
