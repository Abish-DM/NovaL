const prisma = require('../config/prisma');
const contentService = require('../services/content.service');
const { formatContentDTO } = require('./content.controller');

async function uploadContent(req, res, next) {
  try {
    const { title, category, content_type, description } = req.body;
    const file = req.file;

    if (!title || !category || !content_type) {
      return res.status(400).json({ detail: 'Title, category, and content_type are required.' });
    }

    if (!file) {
      return res.status(400).json({ detail: 'File upload is required.' });
    }

    const content = await contentService.createContent(req.user, {
      title,
      category,
      contentType: content_type,
      description,
      file,
    });

    return res.status(201).json(formatContentDTO(content));
  } catch (err) {
    next(err);
  }
}

async function updateContentMetadata(req, res, next) {
  try {
    const id = req.params.id;
    const { title, description, category } = req.body;

    const content = await contentService.updateContent(req.user, id, {
      title,
      description,
      category,
    });

    return res.json(formatContentDTO(content));
  } catch (err) {
    next(err);
  }
}

async function deleteContent(req, res, next) {
  try {
    const id = req.params.id;

    await contentService.deleteContent(req.user, id);

    return res.json({
      message: 'Content successfully deleted',
      id: id,
    });
  } catch (err) {
    next(err);
  }
}

async function getAuditLogs(req, res, next) {
  try {
    let limit = parseInt(req.query.limit || '50', 10);
    if (isNaN(limit) || limit < 1) limit = 50;
    if (limit > 200) limit = 200;

    const logs = await prisma.auditLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    const items = logs.map((l) => ({
      id: l.id,
      admin_id: l.admin_id,
      admin_email: l.admin_email,
      action: l.action,
      content_id: l.content_id,
      details: l.details,
      timestamp: l.timestamp,
    }));

    return res.json({
      items: items,
      total: items.length,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  uploadContent,
  updateContentMetadata,
  deleteContent,
  getAuditLogs,
};
