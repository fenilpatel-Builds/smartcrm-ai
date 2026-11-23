import * as csvService from '../services/data/csvService.js';
import { checkPlanLimit } from '../middleware/planLimitMiddleware.js';

export const importCsv = async (req, res, next) => {
  try {
    const { entityType } = req.params;
    const { rawCsv, rows } = req.body;

    let parsedRows = rows;
    if (!parsedRows || !Array.isArray(parsedRows) || parsedRows.length === 0) {
      if (rawCsv && typeof rawCsv === 'string') {
        parsedRows = csvService.parseCsvString(rawCsv);
      }
    }

    if (!parsedRows || parsedRows.length === 0) {
      return res.status(400).json({ success: false, message: 'Valid rawCsv string or rows array is required.' });
    }

    // Check plan limit before massive import
    if (['customers', 'contacts', 'deals'].includes(entityType)) {
      const planCheck = await checkPlanLimit(req.organizationId, entityType);
      if (!planCheck.allowed) {
        return res.status(403).json({
          success: false,
          code: 'PLAN_LIMIT_EXCEEDED',
          message: planCheck.message,
        });
      }
    }

    const result = await csvService.importEntityData({
      entityType,
      rows: parsedRows,
      organizationId: req.organizationId,
      userId: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: `Import completed: ${result.importedCount} imported, ${result.skippedCount} skipped, ${result.errorCount} errors.`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const exportCsv = async (req, res, next) => {
  try {
    const { entityType } = req.params;
    const csvContent = await csvService.exportEntityCsv({
      entityType,
      organizationId: req.organizationId,
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${entityType}-export-${Date.now()}.csv"`);
    res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};
