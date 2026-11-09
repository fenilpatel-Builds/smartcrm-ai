export const enforceTenant = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required for tenant verification.',
    });
  }

  // Super Admin can inspect an organization if X-Organization-Id header is supplied
  if (req.user.role === 'super_admin') {
    const targetOrg = req.headers['x-organization-id'] || req.user.organizationId;
    req.organizationId = targetOrg;
    if (req.body && !req.body.organizationId && targetOrg) {
      req.body.organizationId = targetOrg;
    }
    return next();
  }

  if (!req.user.organizationId) {
    return res.status(403).json({
      success: false,
      message: 'User does not belong to any organization.',
    });
  }

  // Strictly enforce tenant scoping from authenticated session
  req.organizationId = req.user.organizationId;
  if (req.body) {
    req.body.organizationId = req.user.organizationId;
  }

  next();
};
