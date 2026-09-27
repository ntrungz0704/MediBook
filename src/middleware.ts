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

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const session = (req as any).session;
    if (!session || !session.user) {
      session.intendedUrl = req.originalUrl;
      (req as any).flash('error', 'Vui lòng đăng nhập để tiếp tục.');
      return res.redirect('/login');
    }
    if (!roles.includes(session.user.role)) {
      (req as any).flash('error', 'Bạn không có quyền truy cập trang này.');
      res.status(403).redirect('/');
      return;
    }
    next();
  };
}
