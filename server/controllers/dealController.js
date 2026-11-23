import { Deal } from '../models/Deal.js';
import { Pipeline } from '../models/Pipeline.js';
import { logAudit } from '../services/audit/auditService.js';
import { dispatchAutomationTrigger } from '../services/automation/automationEngineService.js';

const STAGE_DEFAULT_PROBABILITIES = {
  discovery: 10,
  qualified: 25,
  proposal: 50,
  negotiation: 75,
  closed_won: 100,
  closed_lost: 0,
};

export const getDeals = async (req, res, next) => {
  try {
    const { stage, assignedTo, companyId, customerId, search, page = 1, limit = 50, sort = '-createdAt' } = req.query;
    const query = { organizationId: req.organizationId, isDeleted: false };

    if (stage && stage !== 'all') {
      query.stage = stage;
    }

    if (assignedTo) {
      query.assignedTo = assignedTo;
    }

    if (companyId) {
      query.companyId = companyId;
    }

    if (customerId) {
      query.customerId = customerId;
    }

    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [deals, total] = await Promise.all([
      Deal.find(query)
        .populate('companyId', 'name domain industry')
        .populate('contactId', 'firstName lastName email phone')
        .populate('customerId', 'name email company')
        .populate('assignedTo', 'name email avatar')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit, 10)),
      Deal.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: deals,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        pages: Math.ceil(total / parseInt(limit, 10)) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getPipelineView = async (req, res, next) => {
  try {
    const query = { organizationId: req.organizationId, isDeleted: false };

    const deals = await Deal.find(query)
      .populate('companyId', 'name domain industry')
      .populate('contactId', 'firstName lastName email phone')
      .populate('customerId', 'name email company')
      .populate('assignedTo', 'name email avatar')
      .sort('-createdAt');

    const stages = ['discovery', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'];
    const columns = stages.map((st) => {
      const stageDeals = deals.filter((d) => d.stage === st);
      const totalValue = stageDeals.reduce((sum, d) => sum + (d.value || 0), 0);
      const weightedValue = stageDeals.reduce((sum, d) => sum + Math.round(((d.value || 0) * (d.probability || 0)) / 100), 0);

      return {
        stage: st,
        count: stageDeals.length,
        totalValue,
        weightedValue,
        deals: stageDeals,
      };
    });

    res.json({
      success: true,
      data: columns,
    });
  } catch (error) {
    next(error);
  }
};

export const getDealById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deal = await Deal.findOne({
      _id: id,
      organizationId: req.organizationId,
      isDeleted: false,
    })
      .populate('companyId', 'name domain industry phone website')
      .populate('contactId', 'firstName lastName email phone jobTitle')
      .populate('customerId', 'name email company phone')
      .populate('assignedTo', 'name email avatar')
      .populate('stageHistory.changedBy', 'name email');

    if (!deal) {
      return res.status(404).json({ success: false, message: 'Deal not found.' });
    }

    res.json({
      success: true,
      data: deal,
    });
  } catch (error) {
    next(error);
  }
};

export const createDeal = async (req, res, next) => {
  try {
    const {
      title,
      value,
      currency,
      pipelineId,
      stage = 'discovery',
      probability,
      expectedCloseDate,
      companyId,
      contactId,
      customerId,
      assignedTo,
      priority,
      notes,
      tags,
    } = req.body;

    if (!title || value === undefined) {
      return res.status(400).json({ success: false, message: 'Deal title and value are required.' });
    }

    const initialProb = probability !== undefined ? Number(probability) : (STAGE_DEFAULT_PROBABILITIES[stage] ?? 10);

    const deal = await Deal.create({
      organizationId: req.organizationId,
      title: title.trim(),
      value: Number(value),
      currency: currency || 'USD',
      pipelineId: pipelineId || undefined,
      stage,
      probability: initialProb,
      expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : undefined,
      companyId: companyId || undefined,
      contactId: contactId || undefined,
      customerId: customerId || undefined,
      assignedTo: assignedTo || req.user._id,
      priority: priority || 'medium',
      notes: notes || '',
      tags: tags || [],
      stageHistory: [
        {
          stage,
          enteredAt: new Date(),
          changedBy: req.user._id,
        },
      ],
    });

    await logAudit({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'CREATE_DEAL',
      entityType: 'Deal',
      entityId: deal._id,
      metadata: { title: deal.title, value: deal.value, stage: deal.stage },
    });

    dispatchAutomationTrigger({
      organizationId: req.organizationId,
      triggerType: 'deal_created',
      entityType: 'deal',
      entityId: deal._id,
      contextData: { value: deal.value, title: deal.title, stage: deal.stage },
      userId: req.user._id,
    }).catch(() => {});

    res.status(201).json({
      success: true,
      message: 'Deal created successfully',
      data: deal,
    });
  } catch (error) {
    next(error);
  }
};

export const updateDeal = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deal = await Deal.findOne({
      _id: id,
      organizationId: req.organizationId,
      isDeleted: false,
    });

    if (!deal) {
      return res.status(404).json({ success: false, message: 'Deal not found.' });
    }

    Object.assign(deal, req.body);
    await deal.save();

    await logAudit({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'UPDATE_DEAL',
      entityType: 'Deal',
      entityId: deal._id,
      metadata: { title: deal.title, stage: deal.stage, value: deal.value },
    });

    res.json({
      success: true,
      message: 'Deal updated successfully',
      data: deal,
    });
  } catch (error) {
    next(error);
  }
};

export const updateDealStage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { stage, lostReason, probability } = req.body;

    if (!stage) {
      return res.status(400).json({ success: false, message: 'Stage is required.' });
    }

    const deal = await Deal.findOne({
      _id: id,
      organizationId: req.organizationId,
      isDeleted: false,
    });

    if (!deal) {
      return res.status(404).json({ success: false, message: 'Deal not found.' });
    }

    const previousStage = deal.stage;
    deal.stage = stage;

    // Update probability
    if (probability !== undefined) {
      deal.probability = Number(probability);
    } else {
      deal.probability = STAGE_DEFAULT_PROBABILITIES[stage] ?? deal.probability;
    }

    if (stage === 'closed_won') {
      deal.actualCloseDate = new Date();
      deal.probability = 100;
    } else if (stage === 'closed_lost') {
      deal.actualCloseDate = new Date();
      deal.probability = 0;
      if (lostReason) deal.lostReason = lostReason;
    }

    // Append to stage history
    if (deal.stageHistory.length > 0) {
      deal.stageHistory[deal.stageHistory.length - 1].exitedAt = new Date();
    }
    deal.stageHistory.push({
      stage,
      enteredAt: new Date(),
      changedBy: req.user._id,
    });

    await deal.save();

    await logAudit({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'MOVE_DEAL_STAGE',
      entityType: 'Deal',
      entityId: deal._id,
      metadata: { from: previousStage, to: stage, value: deal.value },
    });

    if (stage === 'closed_won') {
      dispatchAutomationTrigger({
        organizationId: req.organizationId,
        triggerType: 'deal_won',
        entityType: 'deal',
        entityId: deal._id,
        contextData: { value: deal.value, title: deal.title },
        userId: req.user._id,
      }).catch(() => {});
    }

    res.json({
      success: true,
      message: `Deal stage moved to ${stage}`,
      data: deal,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteDeal = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deal = await Deal.findOne({
      _id: id,
      organizationId: req.organizationId,
      isDeleted: false,
    });

    if (!deal) {
      return res.status(404).json({ success: false, message: 'Deal not found.' });
    }

    deal.isDeleted = true;
    await deal.save();

    await logAudit({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'DELETE_DEAL',
      entityType: 'Deal',
      entityId: deal._id,
      metadata: { title: deal.title },
    });

    res.json({
      success: true,
      message: 'Deal deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getDealForecast = async (req, res, next) => {
  try {
    const deals = await Deal.find({ organizationId: req.organizationId, isDeleted: false });

    let totalPipelineValue = 0;
    let weightedForecast = 0;
    let wonValue = 0;
    let lostValue = 0;
    let wonCount = 0;
    let totalClosed = 0;

    deals.forEach((d) => {
      const val = d.value || 0;
      if (d.stage === 'closed_won') {
        wonValue += val;
        wonCount += 1;
        totalClosed += 1;
      } else if (d.stage === 'closed_lost') {
        lostValue += val;
        totalClosed += 1;
      } else {
        totalPipelineValue += val;
        weightedForecast += Math.round((val * (d.probability || 0)) / 100);
      }
    });

    const winRate = totalClosed > 0 ? Math.round((wonCount / totalClosed) * 100) : 0;

    res.json({
      success: true,
      data: {
        totalDeals: deals.length,
        totalPipelineValue,
        weightedForecast,
        wonValue,
        lostValue,
        winRate,
      },
    });
  } catch (error) {
    next(error);
  }
};
