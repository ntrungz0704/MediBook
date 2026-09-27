function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    req.session.intendedUrl = req.originalUrl;
    req.flash('error', 'Vui lòng đăng nhập để tiếp tục.');
    return res.redirect('/login');
  }
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      req.session.intendedUrl = req.originalUrl;
      req.flash('error', 'Vui lòng đăng nhập để tiếp tục.');
      return res.redirect('/login');
    }
    if (!roles.includes(req.session.user.role)) {
      req.flash('error', 'Bạn không có quyền truy cập trang này.');
      return res.status(403).redirect('/');
    }
    next();
  };
}

module.exports = {
  requireAuth,
  requireRole
};
