import { Company } from '../models/Company.js';
import { Contact } from '../models/Contact.js';
import { Deal } from '../models/Deal.js';
import { logAudit } from '../services/audit/auditService.js';

export const getCompanies = async (req, res, next) => {
  try {
    const { search, industry, size, page = 1, limit = 20, sort = '-createdAt' } = req.query;
    const query = { organizationId: req.organizationId, isDeleted: false };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { domain: { $regex: search, $options: 'i' } },
        { industry: { $regex: search, $options: 'i' } },
      ];
    }

    if (industry && industry !== 'all') {
      query.industry = industry;
    }

    if (size && size !== 'all') {
      query.size = size;
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [companies, total] = await Promise.all([
      Company.find(query)
        .populate('assignedTo', 'name email avatar')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit, 10)),
      Company.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: companies,
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

export const getCompanyById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const company = await Company.findOne({
      _id: id,
      organizationId: req.organizationId,
      isDeleted: false,
    }).populate('assignedTo', 'name email avatar');

    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found.' });
    }

    const [contacts, deals] = await Promise.all([
      Contact.find({ companyId: id, organizationId: req.organizationId, isDeleted: false })
        .populate('assignedTo', 'name email'),
      Deal.find({ companyId: id, organizationId: req.organizationId, isDeleted: false })
        .populate('assignedTo', 'name email'),
    ]);

    res.json({
      success: true,
      data: {
        ...company.toObject(),
        contacts,
        deals,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createCompany = async (req, res, next) => {
  try {
    const { name, domain, industry, size, phone, website, address, annualRevenue, assignedTo, tags, notes } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Company name is required.' });
    }

    const company = await Company.create({
      organizationId: req.organizationId,
      name: name.trim(),
      domain: domain ? domain.trim().toLowerCase() : undefined,
      industry: industry || 'Technology',
      size: size || '11-50',
      phone,
      website,
      address: address || {},
      annualRevenue: annualRevenue ? Number(annualRevenue) : 0,
      assignedTo: assignedTo || req.user._id,
      tags: tags || [],
      notes: notes || '',
    });

    await logAudit({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'CREATE_COMPANY',
      entityType: 'Company',
      entityId: company._id,
      metadata: { name: company.name, domain: company.domain },
    });

    res.status(201).json({
      success: true,
      message: 'Company created successfully',
      data: company,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCompany = async (req, res, next) => {
  try {
    const { id } = req.params;
    const company = await Company.findOne({
      _id: id,
      organizationId: req.organizationId,
      isDeleted: false,
    });

    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found.' });
    }

    Object.assign(company, req.body);
    await company.save();

    await logAudit({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'UPDATE_COMPANY',
      entityType: 'Company',
      entityId: company._id,
      metadata: { name: company.name },
    });

    res.json({
      success: true,
      message: 'Company updated successfully',
      data: company,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCompany = async (req, res, next) => {
  try {
    const { id } = req.params;
    const company = await Company.findOne({
      _id: id,
      organizationId: req.organizationId,
      isDeleted: false,
    });

    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found.' });
    }

    company.isDeleted = true;
    await company.save();

    await logAudit({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'DELETE_COMPANY',
      entityType: 'Company',
      entityId: company._id,
      metadata: { name: company.name },
    });

    res.json({
      success: true,
      message: 'Company deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getCompanyMetrics = async (req, res, next) => {
  try {
    const [totalCompanies, enterpriseCompanies, aggregateRevenue] = await Promise.all([
      Company.countDocuments({ organizationId: req.organizationId, isDeleted: false }),
      Company.countDocuments({ organizationId: req.organizationId, size: { $in: ['201-500', '500+'] }, isDeleted: false }),
      Company.aggregate([
        { $match: { organizationId: req.organizationId, isDeleted: false } },
        { $group: { _id: null, totalAnnualRevenue: { $sum: '$annualRevenue' } } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        totalCompanies,
        enterpriseCompanies,
        totalAnnualRevenue: aggregateRevenue[0]?.totalAnnualRevenue || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};
