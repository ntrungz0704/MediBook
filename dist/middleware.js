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
function requireRole(...roles) {
    return (req, res, next) => {
        const session = req.session;
        if (!session || !session.user) {
            session.intendedUrl = req.originalUrl;
            req.flash('error', 'Vui lòng đăng nhập để tiếp tục.');
            return res.redirect('/login');
        }
        if (!roles.includes(session.user.role)) {
            req.flash('error', 'Bạn không có quyền truy cập trang này.');
            res.status(403).redirect('/');
            return;
        }
        next();
    };
}
