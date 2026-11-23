import * as jobQueueService from '../services/jobs/jobQueueService.js';

export const getJobMetrics = async (req, res, next) => {
  try {
    const metrics = await jobQueueService.getQueueMetrics();
    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    next(error);
  }
};

export const retryJob = async (req, res, next) => {
  try {
    const { id } = req.params;
    const job = await jobQueueService.retryJob(id);
    res.json({
      success: true,
      message: 'Job queued for immediate retry',
      data: job,
    });
  } catch (error) {
    next(error);
  }
};

export const triggerJobNow = async (req, res, next) => {
  try {
    const { jobName, payload } = req.body;
    if (!jobName) {
      return res.status(400).json({ success: false, message: 'jobName is required.' });
    }

    const job = await jobQueueService.enqueueJob({
      jobName,
      organizationId: req.organizationId,
      payload,
      scheduledFor: new Date(),
    });

    res.status(201).json({
      success: true,
      message: `Job ${jobName} enqueued successfully`,
      data: job,
    });
  } catch (error) {
    next(error);
  }
};
