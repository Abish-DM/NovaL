const path = require('path');
const crypto = require('crypto');
const config = require('../config/env');
const prisma = require('../config/prisma');
const storageService = require('./storage.service');

const ALLOWED_EXTENSIONS = {
  VIDEO: ['.mp4'],
  PDF: ['.pdf'],
  HTML: ['.html', '.htm'],
};

const ALLOWED_MIME_TYPES = {
  VIDEO: ['video/mp4'],
  PDF: ['application/pdf'],
  HTML: ['text/html', 'application/xhtml+xml'],
};

function sanitizeFilename(filename) {
  const base = path.basename(filename || 'file');
  const safe = base.replace(/[^a-zA-Z0-9_.-]/g, '_');
  return safe || 'file';
}

function validateFile(file, contentType) {
  if (!file || !file.buffer || file.buffer.length === 0) {
    const err = new Error('Uploaded file cannot be empty.');
    err.statusCode = 400;
    throw err;
  }

  const maxBytes = config.MAX_UPLOAD_SIZE_MB * 1024 * 1024;
  if (file.buffer.length > maxBytes) {
    const err = new Error(`File exceeds maximum allowed size of ${config.MAX_UPLOAD_SIZE_MB}MB.`);
    err.statusCode = 400;
    throw err;
  }

  const filename = file.originalname || '';
  const ext = path.extname(filename).toLowerCase();
  const allowedExts = ALLOWED_EXTENSIONS[contentType] || [];
  if (!allowedExts.includes(ext)) {
    const err = new Error(
      `Invalid file extension '${ext}' for content type ${contentType}. Allowed extensions: ${allowedExts.join(', ')}`
    );
    err.statusCode = 400;
    throw err;
  }

  const mime = file.mimetype || '';
  const allowedMimes = ALLOWED_MIME_TYPES[contentType] || [];
  if (mime && !allowedMimes.some((allowed) => mime.toLowerCase().includes(allowed))) {
    const err = new Error(`Invalid MIME type '${mime}' for content type ${contentType}.`);
    err.statusCode = 400;
    throw err;
  }
}

function sanitizeHtmlContent(htmlBuffer) {
  try {
    let rawText = htmlBuffer.toString('utf-8');
    // Neutralize script tags and inline execution attributes
    rawText = rawText.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    rawText = rawText.replace(/on\w+\s*=\s*"[^"]*"/gi, '');
    rawText = rawText.replace(/on\w+\s*=\s*'[^']*'/gi, '');
    rawText = rawText.replace(/javascript\s*:[^\s"']+/gi, '#');
    return Buffer.from(rawText, 'utf-8');
  } catch (err) {
    return htmlBuffer;
  }
}

async function logAuditAction(admin, action, contentId, details) {
  return await prisma.auditLog.create({
    data: {
      admin_id: admin.id,
      admin_email: admin.email,
      action: action,
      content_id: contentId,
      details: details,
    },
  });
}

class ContentService {
  async createContent(admin, { title, category, contentType, description, file }) {
    validateFile(file, contentType);

    let fileBuffer = file.buffer;
    if (contentType === 'HTML') {
      fileBuffer = sanitizeHtmlContent(fileBuffer);
    }

    const fileId = crypto.randomUUID();
    const safeOrigName = sanitizeFilename(file.originalname);
    const storageKey = `content/${fileId}/${safeOrigName}`;
    const mimeType = file.mimetype || 'application/octet-stream';

    await storageService.saveObject(storageKey, fileBuffer, mimeType);

    const content = await prisma.content.create({
      data: {
        id: fileId,
        title: title,
        description: description || null,
        category: category,
        content_type: contentType,
        storage_key: storageKey,
        original_filename: safeOrigName,
        mime_type: mimeType,
        file_size: BigInt(fileBuffer.length),
        created_by: admin.id,
      },
    });

    await logAuditAction(admin, 'UPLOAD', content.id, `Uploaded '${title}' (${contentType})`);
    return content;
  }

  async updateContent(admin, contentId, { title, description, category }) {
    const content = await prisma.content.findUnique({
      where: { id: contentId },
    });

    if (!content) {
      const err = new Error('Content not found');
      err.statusCode = 404;
      throw err;
    }

    const updateData = {};
    const changes = [];

    if (title !== undefined && title !== null) {
      changes.push(`Title: ${content.title} -> ${title}`);
      updateData.title = title;
    }
    if (description !== undefined) {
      updateData.description = description;
      changes.push('Updated description');
    }
    if (category !== undefined && category !== null) {
      changes.push(`Category: ${content.category} -> ${category}`);
      updateData.category = category;
    }

    const updated = await prisma.content.update({
      where: { id: contentId },
      data: updateData,
    });

    await logAuditAction(admin, 'EDIT', contentId, `Edited metadata: ${changes.join(', ')}`);
    return updated;
  }

  async deleteContent(admin, contentId) {
    const content = await prisma.content.findUnique({
      where: { id: contentId },
    });

    if (!content) {
      const err = new Error('Content not found');
      err.statusCode = 404;
      throw err;
    }

    await storageService.deleteObject(content.storage_key);

    const title = content.title;
    await prisma.content.delete({
      where: { id: contentId },
    });

    await logAuditAction(admin, 'DELETE', contentId, `Deleted '${title}'`);
    return true;
  }

  async incrementViewCount(contentId) {
    try {
      await prisma.content.update({
        where: { id: contentId },
        data: {
          view_count: {
            increment: 1,
          },
        },
      });
    } catch (e) {
      // Ignore non-fatal view count increment errors
    }
  }
}

module.exports = new ContentService();
