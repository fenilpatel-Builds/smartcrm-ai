import * as analyticsService from '../services/analytics/analyticsService.js';

export const getDashboardAnalytics = async (req, res, next) => {
  try {
    const data = await analyticsService.getDashboardMetrics(req.organizationId);
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getReports = async (req, res, next) => {
  try {
    const { startDate, endDate, reportType } = req.query;
    const reports = await analyticsService.getReportsData(req.organizationId, {
      startDate,
      endDate,
      reportType,
    });

    res.json({
      success: true,
      data: reports,
    });
  } catch (error) {
    next(error);
  }
};
