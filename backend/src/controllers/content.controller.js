const prisma = require('../config/prisma');
const storageService = require('../services/storage.service');
const contentService = require('../services/content.service');

function formatContentDTO(item) {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    category: item.category,
    content_type: item.content_type,
    storage_key: item.storage_key,
    original_filename: item.original_filename,
    mime_type: item.mime_type,
    file_size: Number(item.file_size),
    view_count: item.view_count,
    created_by: item.created_by,
    created_at: item.created_at,
    updated_at: item.updated_at,
  };
}

async function listContent(req, res, next) {
  try {
    const { search, category, content_type } = req.query;

    const where = {};

    if (search && search.trim()) {
      const searchPattern = search.trim();
      where.OR = [
        { title: { contains: searchPattern, mode: 'insensitive' } },
        { description: { contains: searchPattern, mode: 'insensitive' } },
      ];
    }

    if (category) {
      where.category = category;
    }

    if (content_type) {
      where.content_type = content_type;
    }

    const items = await prisma.content.findMany({
      where: where,
      orderBy: { created_at: 'desc' },
    });

    const allCategoriesRaw = await prisma.content.findMany({
      select: { category: true },
      distinct: ['category'],
    });

    const categories = allCategoriesRaw
      .map((c) => c.category)
      .filter(Boolean)
      .sort();

    return res.json({
      items: items.map(formatContentDTO),
      total: items.length,
      categories: categories,
    });
  } catch (err) {
    next(err);
  }
}

async function getContentDetail(req, res, next) {
  try {
    const id = req.params.id;
    const content = await prisma.content.findUnique({
      where: { id: id },
    });

    if (!content) {
      return res.status(404).json({ detail: 'Content not found' });
    }

    await contentService.incrementViewCount(id);

    return res.json(formatContentDTO(content));
  } catch (err) {
    next(err);
  }
}

async function streamVideo(req, res, next) {
  try {
    const id = req.params.id;
    const content = await prisma.content.findUnique({
      where: { id: id },
    });

    if (!content) {
      return res.status(404).json({ detail: 'Content not found' });
    }

    if (content.content_type !== 'VIDEO') {
      return res.status(400).json({ detail: 'Requested content is not a video' });
    }

    let fileSize;
    try {
      fileSize = await storageService.getObjectSize(content.storage_key);
    } catch (err) {
      return res.status(404).json({ detail: 'Video file missing from storage' });
    }

    const rangeHeader = req.headers.range;

    if (!rangeHeader) {
      const videoBytes = await storageService.getObject(content.storage_key);
      res.set({
        'Accept-Ranges': 'bytes',
        'Content-Length': fileSize.toString(),
        'Content-Type': content.mime_type || 'video/mp4',
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      });
      return res.status(200).send(videoBytes);
    }

    // Parse Range Header (Range: bytes=start-end)
    let start = 0;
    let end = null;

    try {
      const parts = rangeHeader.replace(/bytes=/, '').split('-');
      start = parseInt(parts[0], 10) || 0;
      end = parts[1] ? parseInt(parts[1], 10) : null;
    } catch (e) {
      return res.status(400).json({ detail: 'Invalid Range header format' });
    }

    const CHUNK_SIZE = 1024 * 1024; // 1MB chunk limit
    if (end === null || end >= fileSize) {
      end = Math.min(start + CHUNK_SIZE - 1, fileSize - 1);
    }

    if (start > end || start >= fileSize) {
      res.set('Content-Range', `bytes */${fileSize}`);
      return res.status(416).end();
    }

    const chunkBytes = await storageService.getObjectRange(content.storage_key, start, end);
    const contentLength = chunkBytes.length;

    res.status(206).set({
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': contentLength.toString(),
      'Content-Type': content.mime_type || 'video/mp4',
      'Cache-Control': 'private, no-cache, no-store, must-revalidate',
    });

    return res.send(chunkBytes);
  } catch (err) {
    next(err);
  }
}

async function getPdfStream(req, res, next) {
  try {
    const id = req.params.id;
    const content = await prisma.content.findUnique({
      where: { id: id },
    });

    if (!content) {
      return res.status(404).json({ detail: 'Content not found' });
    }

    if (content.content_type !== 'PDF') {
      return res.status(400).json({ detail: 'Requested content is not a PDF document' });
    }

    let pdfBytes;
    try {
      pdfBytes = await storageService.getObject(content.storage_key);
    } catch (err) {
      return res.status(404).json({ detail: 'PDF file missing from storage' });
    }

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${content.original_filename}"`,
      'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
    });

    return res.send(pdfBytes);
  } catch (err) {
    next(err);
  }
}

async function getHtmlContent(req, res, next) {
  try {
    const id = req.params.id;
    const content = await prisma.content.findUnique({
      where: { id: id },
    });

    if (!content) {
      return res.status(404).json({ detail: 'Content not found' });
    }

    if (content.content_type !== 'HTML') {
      return res.status(400).json({ detail: 'Requested content is not HTML' });
    }

    let htmlBytes;
    try {
      htmlBytes = await storageService.getObject(content.storage_key);
    } catch (err) {
      return res.status(404).json({ detail: 'HTML file missing from storage' });
    }

    res.set({
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy':
        "default-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; object-src 'none';",
    });

    return res.send(htmlBytes);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  formatContentDTO,
  listContent,
  getContentDetail,
  streamVideo,
  getPdfStream,
  getHtmlContent,
};
