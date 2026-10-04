import { Request, Response, NextFunction } from 'express';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const session = (req as any).session;
  if (!session || !session.user) {
    session.intendedUrl = req.originalUrl;
    (req as any).flash('error', 'Vui lòng đăng nhập để tiếp tục.');
    return res.redirect('/login');
  }
  next();
}

/**
 * Role-Based Access Control Middleware
 * Supports single-role and multi-role users (checks session.user.roles or session.user.role)
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const session = (req as any).session;
    if (!session || !session.user) {
      session.intendedUrl = req.originalUrl;
      (req as any).flash('error', 'Vui lòng đăng nhập để tiếp tục.');
      return res.redirect('/login');
    }

    const user = session.user;
    const userRoles: string[] = Array.isArray(user.roles) && user.roles.length > 0
      ? user.roles
      : [user.role || 'patient'];

    // Check if the user has at least one of the required roles
    const hasRole = roles.some(r => userRoles.includes(r));
    if (!hasRole) {
      (req as any).flash('error', 'Bạn không có quyền truy cập trang này.');
      res.redirect(403, '/');
      return;
    }
    next();
  };
}
