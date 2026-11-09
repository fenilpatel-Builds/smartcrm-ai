import { AuditLog } from '../../models/AuditLog.js';

export const logAudit = async ({ organizationId, userId, action, entityType, entityId, metadata = {} }) => {
  try {
    if (!organizationId) return null;
    return await AuditLog.create({
      organizationId,
      userId,
      action,
      entityType,
      entityId,
      metadata,
    });
  } catch (err) {
    console.error('[AuditLog] Failed to create audit log:', err.message);
    return null;
  }
};
