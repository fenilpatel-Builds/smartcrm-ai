import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Document } from '../models/Document.js';
import { logAudit } from '../services/audit/auditService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_DIR = path.resolve(__dirname, '../uploads/documents');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export const getDocuments = async (req, res, next) => {
  try {
    const { category, relatedEntityType, relatedEntityId, search, page = 1, limit = 20, sort = '-createdAt' } = req.query;
    const query = { organizationId: req.organizationId, isDeleted: false };

    if (category && category !== 'all') {
      query.category = category;
    }

    if (relatedEntityType && relatedEntityType !== 'all') {
      query.relatedEntityType = relatedEntityType;
    }

    if (relatedEntityId) {
      query.relatedEntityId = relatedEntityId;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { originalName: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [documents, total] = await Promise.all([
      Document.find(query)
        .populate('uploadedBy', 'name email avatar')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit, 10)),
      Document.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: documents,
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

export const uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    const { title, category = 'Other', relatedEntityType = 'general', relatedEntityId, tags } = req.body;

    const doc = await Document.create({
      organizationId: req.organizationId,
      title: (title || req.file.originalname).trim(),
      fileName: req.file.filename,
      originalName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      category,
      relatedEntityType,
      relatedEntityId: relatedEntityId || undefined,
      uploadedBy: req.user._id,
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map((t) => t.trim())) : [],
    });

    await logAudit({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'UPLOAD_DOCUMENT',
      entityType: 'Document',
      entityId: doc._id,
      metadata: { originalName: doc.originalName, fileSize: doc.fileSize, category: doc.category },
    });

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: doc,
    });
  } catch (error) {
    next(error);
  }
};

export const downloadDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const doc = await Document.findOne({ _id: id, organizationId: req.organizationId, isDeleted: false });

    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    if (!fs.existsSync(doc.filePath)) {
      return res.status(404).json({ success: false, message: 'File not found on storage disk.' });
    }

    res.download(doc.filePath, doc.originalName);
  } catch (error) {
    next(error);
  }
};

export const deleteDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const doc = await Document.findOne({ _id: id, organizationId: req.organizationId, isDeleted: false });

    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    doc.isDeleted = true;
    await doc.save();

    await logAudit({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'DELETE_DOCUMENT',
      entityType: 'Document',
      entityId: doc._id,
      metadata: { originalName: doc.originalName },
    });

    res.json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getDocumentMetrics = async (req, res, next) => {
  try {
    const [totalDocs, aggregateSize, categories] = await Promise.all([
      Document.countDocuments({ organizationId: req.organizationId, isDeleted: false }),
      Document.aggregate([
        { $match: { organizationId: req.organizationId, isDeleted: false } },
        { $group: { _id: null, totalBytes: { $sum: '$fileSize' } } },
      ]),
      Document.aggregate([
        { $match: { organizationId: req.organizationId, isDeleted: false } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        totalDocuments: totalDocs,
        totalBytes: aggregateSize[0]?.totalBytes || 0,
        categoryCounts: categories.reduce((acc, cur) => ({ ...acc, [cur._id]: cur.count }), {}),
      },
    });
  } catch (error) {
    next(error);
  }
};
