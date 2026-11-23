export const ALL_ROLES = [
  'super_admin',
  'owner',
  'org_admin',
  'manager',
  'sales_manager',
  'sales_rep',
  'finance_manager',
  'support_agent',
  'viewer',
  'employee',
];

export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    // super_admin always has access across roles
    if (req.user.role === 'super_admin') {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: User role '${req.user.role}' is not authorized to access this resource.`,
      });
    }

    next();
  };
};

/**
 * Ensures that read-only roles (e.g., 'viewer') cannot execute write operations (POST, PUT, PATCH, DELETE)
 */
export const enforceWritePermission = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  if (req.user.role === 'viewer' && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Viewers have read-only access and cannot perform modifications.',
    });
  }

  next();
};
