const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/prisma');
const { createSessionToken } = require('../src/utils/security');
const storageService = require('../src/services/storage.service');

describe('Secure Content Portal Node/Express API Test Suite', () => {
  let adminUser;
  let viewerUser;
  let adminToken;
  let viewerToken;

  beforeAll(async () => {
    // Ensure clean test database state
    await prisma.auditLog.deleteMany();
    await prisma.content.deleteMany();
    await prisma.user.deleteMany();

    // Create Admin User matching ADMIN_EMAIL (admin@example.com)
    adminUser = await prisma.user.create({
      data: {
        google_id: 'google_admin_id_101',
        email: 'admin@example.com',
        name: 'Admin Test User',
        role: 'ADMIN',
      },
    });

    // Create Viewer User
    viewerUser = await prisma.user.create({
      data: {
        google_id: 'google_viewer_id_202',
        email: 'viewer@example.com',
        name: 'Viewer Test User',
        role: 'VIEWER',
      },
    });

    adminToken = createSessionToken({ sub: adminUser.id, email: adminUser.email, role: 'ADMIN' });
    viewerToken = createSessionToken({ sub: viewerUser.id, email: viewerUser.email, role: 'VIEWER' });
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany();
    await prisma.content.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  describe('1. Health & Unauthenticated Access Security', () => {
    test('GET /api/health returns healthy status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toEqual('healthy');
    });

    test('GET /api/auth/me unauthenticated returns 401 Unauthorized', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.statusCode).toEqual(401);
      expect(res.body.detail).toMatch(/Authentication required/i);
    });

    test('GET /api/content unauthenticated returns 401 Unauthorized', async () => {
      const res = await request(app).get('/api/content');
      expect(res.statusCode).toEqual(401);
    });
  });

  describe('2. Authentication & Google OAuth URL', () => {
    test('GET /api/auth/google/login returns Google OAuth authorization URL', async () => {
      const res = await request(app).get('/api/auth/google/login');
      expect(res.statusCode).toEqual(200);
      expect(res.body.url).toContain('accounts.google.com');
    });

    test('GET /api/auth/me authenticated as viewer returns user profile', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', [`session_token=${viewerToken}`]);
      expect(res.statusCode).toEqual(200);
      expect(res.body.email).toEqual('viewer@example.com');
      expect(res.body.role).toEqual('VIEWER');
    });

    test('POST /api/auth/logout clears session cookie', async () => {
      const res = await request(app).post('/api/auth/logout');
      expect(res.statusCode).toEqual(200);
      const setCookie = res.headers['set-cookie'][0];
      expect(setCookie).toMatch(/session_token=/);
    });
  });

  describe('3. Server-Side RBAC Authorization Boundary', () => {
    test('Viewer attempting POST /api/admin/content receives 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/admin/content')
        .set('Cookie', [`session_token=${viewerToken}`])
        .field('title', 'Forbidden Upload')
        .field('category', 'General')
        .field('content_type', 'PDF')
        .attach('file', Buffer.from('%PDF-1.4 test'), 'test.pdf');
      expect(res.statusCode).toEqual(403);
      expect(res.body.detail).toMatch(/Administrative privileges required/i);
    });

    test('Viewer attempting PATCH /api/admin/content/:id receives 403 Forbidden', async () => {
      const res = await request(app)
        .patch('/api/admin/content/dummy-uuid-123')
        .set('Cookie', [`session_token=${viewerToken}`])
        .send({ title: 'Hacked Title' });
      expect(res.statusCode).toEqual(403);
    });

    test('Viewer attempting DELETE /api/admin/content/:id receives 403 Forbidden', async () => {
      const res = await request(app)
        .delete('/api/admin/content/dummy-uuid-123')
        .set('Cookie', [`session_token=${viewerToken}`]);
      expect(res.statusCode).toEqual(403);
    });

    test('Viewer attempting GET /api/admin/audit-logs receives 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/admin/audit-logs')
        .set('Cookie', [`session_token=${viewerToken}`]);
      expect(res.statusCode).toEqual(403);
    });
  });

  describe('4. Admin Upload, Edit, Audit Logs, and Delete Operations', () => {
    let createdContentId;
    let videoContentId;
    let pdfContentId;
    let htmlContentId;

    test('Admin upload empty file receives 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/admin/content')
        .set('Cookie', [`session_token=${adminToken}`])
        .field('title', 'Empty File')
        .field('category', 'Training')
        .field('content_type', 'PDF')
        .attach('file', Buffer.from(''), 'empty.pdf');
      expect(res.statusCode).toEqual(400);
      expect(res.body.detail).toMatch(/cannot be empty/i);
    });

    test('Admin upload invalid extension receives 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/admin/content')
        .set('Cookie', [`session_token=${adminToken}`])
        .field('title', 'Bad File')
        .field('category', 'Training')
        .field('content_type', 'PDF')
        .attach('file', Buffer.from('exe content'), 'virus.exe');
      expect(res.statusCode).toEqual(400);
      expect(res.body.detail).toMatch(/Invalid file extension/i);
    });

    test('Admin uploads valid PDF content', async () => {
      const res = await request(app)
        .post('/api/admin/content')
        .set('Cookie', [`session_token=${adminToken}`])
        .field('title', 'Security Guidelines PDF')
        .field('description', 'Company Security Guide')
        .field('category', 'Compliance')
        .field('content_type', 'PDF')
        .attach('file', Buffer.from('%PDF-1.4 Fake PDF Data'), 'guide.pdf');
      expect(res.statusCode).toEqual(201);
      expect(res.body.title).toEqual('Security Guidelines PDF');
      expect(res.body.content_type).toEqual('PDF');
      pdfContentId = res.body.id;
    });

    test('Admin uploads valid Video content', async () => {
      const videoBuffer = Buffer.alloc(50000, 'A');
      const res = await request(app)
        .post('/api/admin/content')
        .set('Cookie', [`session_token=${adminToken}`])
        .field('title', 'Intro Video MP4')
        .field('category', 'Onboarding')
        .field('content_type', 'VIDEO')
        .attach('file', videoBuffer, 'intro.mp4');
      expect(res.statusCode).toEqual(201);
      expect(res.body.content_type).toEqual('VIDEO');
      videoContentId = res.body.id;
    });

    test('Admin uploads valid HTML content (with sanitization)', async () => {
      const rawHtml = Buffer.from('<div><h1>Interactive Module</h1><script>alert("xss")</script></div>');
      const res = await request(app)
        .post('/api/admin/content')
        .set('Cookie', [`session_token=${adminToken}`])
        .field('title', 'Interactive HTML Module')
        .field('category', 'Training')
        .field('content_type', 'HTML')
        .attach('file', rawHtml, 'module.html');
      expect(res.statusCode).toEqual(201);
      expect(res.body.content_type).toEqual('HTML');
      htmlContentId = res.body.id;
    });

    test('Admin edits metadata', async () => {
      const res = await request(app)
        .patch(`/api/admin/content/${pdfContentId}`)
        .set('Cookie', [`session_token=${adminToken}`])
        .send({ title: 'Updated Security Guidelines PDF', category: 'Policies' });
      expect(res.statusCode).toEqual(200);
      expect(res.body.title).toEqual('Updated Security Guidelines PDF');
      expect(res.body.category).toEqual('Policies');
    });

    test('Admin retrieves audit logs', async () => {
      const res = await request(app)
        .get('/api/admin/audit-logs')
        .set('Cookie', [`session_token=${adminToken}`]);
      expect(res.statusCode).toEqual(200);
      expect(res.body.items.length).toBeGreaterThanOrEqual(3);
      expect(res.body.items[0].admin_email).toEqual('admin@example.com');
    });

    test('Protected Video Range request returns 206 Partial Content', async () => {
      const res = await request(app)
        .get(`/api/content/${videoContentId}/stream`)
        .set('Cookie', [`session_token=${viewerToken}`])
        .set('Range', 'bytes=0-999');
      expect(res.statusCode).toEqual(206);
      expect(res.headers['accept-ranges']).toEqual('bytes');
      expect(res.headers['content-range']).toMatch(/^bytes 0-999\//);
      expect(res.headers['content-type']).toEqual('video/mp4');
    });

    test('Protected PDF Stream returns application/pdf binary', async () => {
      const res = await request(app)
        .get(`/api/content/${pdfContentId}/pdf`)
        .set('Cookie', [`session_token=${viewerToken}`]);
      expect(res.statusCode).toEqual(200);
      expect(res.headers['content-type']).toEqual('application/pdf');
    });

    test('Protected HTML endpoint returns sanitized HTML with CSP headers', async () => {
      const res = await request(app)
        .get(`/api/content/${htmlContentId}/html`)
        .set('Cookie', [`session_token=${viewerToken}`]);
      expect(res.statusCode).toEqual(200);
      expect(res.headers['content-type']).toContain('text/html');
      expect(res.headers['content-security-policy']).toBeDefined();
      expect(res.text).not.toContain('<script>');
    });

    test('Admin deletes content', async () => {
      const res = await request(app)
        .delete(`/api/admin/content/${pdfContentId}`)
        .set('Cookie', [`session_token=${adminToken}`]);
      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toEqual('Content successfully deleted');
    });
  });
});
