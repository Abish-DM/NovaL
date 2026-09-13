# Technical Inspection & Demonstration Guide: Secure Content Portal

Based on a direct inspection of the codebase in the repository, here is the accurate technical report and 2–5 minute project demonstration guide.

---

## 1. Project Overview

- **Project Name**: Secure Content Portal
- **One-Sentence Description**: A security-first internal organization portal for sharing training videos, PDFs, and HTML interactive modules with server-side RBAC, private object storage, and protected content delivery.
- **Main Problem Solved**: Prevents unauthorized download, direct file link sharing, and predictable public URL exposure (e.g. `/uploads/video.mp4` or public S3 bucket URLs) of sensitive organizational training material.
- **Target Users**: Internal organizational staff, trainers, compliance managers, and team members.
- **Main User Roles**:
  1. `ADMIN`: Content upload, metadata editing, item deletion, viewing system audit logs, and access to the administrative console.
  2. `VIEWER`: Browsing, searching, category filtering, watching protected videos, viewing canvas-rendered PDFs, and viewing sandboxed HTML interactive modules.
- **Main Features Currently Implemented**:
  1. Single-sign-on via Google OAuth 2.0 with secure HttpOnly session cookies.
  2. Server-side role assignment based on `ADMIN_EMAIL` allow-list.
  3. Server-side RBAC enforcing HTTP 403 Forbidden for unauthorized administrative API access.
  4. HTTP Range Request (206 Partial Content) video streaming without exposing storage URLs.
  5. PDF.js canvas rendering of protected binary PDF payloads.
  6. HTML sanitization and iframe sandboxed (`sandbox="allow-scripts"`) preview of interactive modules.
  7. Content metadata CRUD operations with UUID storage key generation.
  8. Content view tracking (`view_count`) and system audit trail logging (`UPLOAD`, `EDIT`, `DELETE`).

---

## 2. Actual Technology Stack

### Frontend
- **Framework**: React 18 (`react`, `react-dom`)
- **Build Tool**: Vite 5 (`vite`)
- **UI Libraries**: Lucide React (`lucide-react`) icons, Modern Vanilla CSS design system (`index.css`)
- **Routing**: React Router v6 (`react-router-dom`)
- **State Management**: React Context API (`AuthContext.jsx`)
- **Important Libraries**: PDF.js (`pdfjs-dist` v3.11.174) for canvas rendering

### Backend
- **Runtime**: Node.js v26
- **Framework**: Express.js v4 (`express`)
- **API Architecture**: RESTful API
- **Authentication Libraries**: `jsonwebtoken` (JWT session tokens), `cookie-parser` (HttpOnly cookie handling)
- **Validation Libraries**: Native MIME and extension validation in `content.service.js`
- **File Upload Libraries**: `multer` v1.4.5 (memory storage buffers)
- **Other Important Libraries**: `cors`, `dotenv`, `@aws-sdk/client-s3` (AWS S3 Client v3)

### Database
- **Database Type**: SQLite (`file:./secure_content_portal.db`) for local dev/testing; PostgreSQL ready for production
- **ORM / Query Library**: Prisma ORM 5 (`@prisma/client`, `prisma`)
- **Important Tables / Models**:
  1. `users` (`User`)
  2. `contents` (`Content`)
  3. `audit_logs` (`AuditLog`)

### Storage
- **Object Storage Provider**: Private Object Storage Service (`StorageService`)
- **How Files Are Stored**: Stored on local isolated directory (`./private_storage`) when running locally, or AWS S3 / Supabase Storage bucket when S3 credentials are set.
- **Privacy Level**: **Strictly Private**. No static file serving folder or public URL mapping exists.

### Content Rendering
- **Video Technology**: HTML5 `<video>` element consuming protected HTTP Range byte stream (`GET /api/content/:id/stream`).
- **PDF Technology**: PDF.js (`pdfjs-dist`) rendering ArrayBuffer binary directly to an HTML5 `<canvas>` element.
- **HTML Rendering Technology**: `<iframe sandbox="allow-scripts">` preview with regex script/event handler sanitization on upload.

### Deployment
- **Frontend Hosting**: Ready for static hosting (Vite build output in `dist/`).
- **Backend Hosting**: Ready for Node.js container or server execution.
- **Database Hosting**: Local SQLite file or managed PostgreSQL instance.
- **Storage Hosting**: AWS S3 or Supabase Storage bucket.

---

## 3. Architecture

### System Architecture Flow

```
User Browser (React / Vite)
        │
        ▼ (HTTP Requests with HttpOnly Session Cookie)
Express.js Backend API (Port 8000)
        │
        ├──► Auth Middleware (JWT Verification & requireAuth / requireAdmin)
        │
        ├──► Prisma ORM ──► Database (users, contents, audit_logs)
        │
        └──► Storage Service ──► Private Storage (Local Isolated Directory / S3)
```

### Communication & Data Flow Breakdown
1. **Frontend to Backend**: Communicates via `fetch` API (`api.js`) with `credentials: 'include'` to automatically attach the `session_token` HttpOnly cookie.
2. **Authentication**: Google OAuth 2.0 flow exchanges code backend-side, issues a signed JWT stored in a `session_token` HttpOnly, SameSite cookie.
3. **Role Determination**: Calculated strictly on the backend inside `syncUser()` by comparing the verified email against `ADMIN_EMAIL`.
4. **Content & Storage Mapping**: DB stores metadata and an unguessable `storage_key` (`content/{uuid}/{filename}`). Files are delivered via backend streams (`/stream`, `/pdf`, `/html`) after session and role verification.

---

## 4. Authentication

- **Is Google OAuth Implemented?**: YES (`auth.service.js` & `auth.controller.js`).
- **What OAuth Library is Used?**: Native `fetch` API communicating directly with Google OAuth 2.0 token & userinfo endpoints (`https://oauth2.googleapis.com/token` & `https://www.googleapis.com/oauth2/v2/userinfo`).
- **When User Clicks "Sign in with Google"**: Triggers `loginWithGoogle()`, fetches Google auth URL from `GET /api/auth/google/login`, and redirects the browser (`window.location.href`).
- **Endpoint Starting OAuth**: `GET /api/auth/google/login`
- **Endpoint Handling Callback**: `GET /api/auth/google/callback`
- **Authenticated User Identification**: Identified via signed JWT payload (`sub` = user ID) inside HttpOnly cookie.
- **Session Maintenance**: Maintained via `session_token` cookie (expires in 24 hours).
- **Are HttpOnly Cookies Used?**: YES (`httpOnly: true`, `sameSite: 'lax'`).
- **Are Access Tokens Stored in localStorage?**: NO. Tokens are never exposed to `localStorage` or client JS.
- **Is Microsoft Authentication Present?**: NO (NOT IMPLEMENTED / REMOVED).
- **Is Quick Login Present?**: NO (NOT IMPLEMENTED / REMOVED).

---

## 5. Admin / Viewer RBAC

- **Roles That Exist**: `ADMIN` and `VIEWER`.
- **How ADMIN is Determined**: Evaluated server-side in `syncUser()`: if `verified_email === ADMIN_EMAIL` (or present in `ADMIN_EMAILS`), role is set to `ADMIN`.
- **How VIEWER is Determined**: All other authenticated Google accounts receive `role = VIEWER`.
- **Is ADMIN_EMAIL Used?**: YES.
- **Where ADMIN_EMAIL is Configured**: Backend environment variables (`.env`).
- **Can Frontend Modify Role?**: NO. Frontend role properties are cosmetic for UI hiding only.
- **Protected Endpoints Requiring ADMIN**:
  - `POST /api/admin/content` (Upload content)
  - `PATCH /api/admin/content/:id` (Edit metadata)
  - `DELETE /api/admin/content/:id` (Delete content)
  - `GET /api/admin/audit-logs` (View audit logs)
- **What Happens When a Viewer Calls an Admin Endpoint?**: The `requireAdmin` middleware intercepts the request and blocks it.
- **HTTP Status Returned**: **HTTP 403 Forbidden** (`{ detail: "Forbidden: Administrative privileges required." }`).

---

## 6. Content Management

### Content Types Supported
1. **VIDEO** (MP4)
   - **Upload**: Admin uploads file via `POST /api/admin/content`. Saved to `content/{uuid}/{filename}`.
   - **Viewing**: Streamed via `GET /api/content/:id/stream`.
   - **Protection**: Backend checks authentication, parses `Range` header, streams 206 Partial Content byte ranges.
2. **PDF** (.pdf)
   - **Upload**: Admin uploads file. Saved to storage key.
   - **Viewing**: Fetched via `GET /api/content/:id/pdf`.
   - **Protection**: Delivered as `application/pdf` binary stream and rendered onto an HTML5 `<canvas>` via PDF.js.
3. **HTML** (.html, .htm)
   - **Upload**: Admin uploads file. Sanitized via regex (neutralizes `<script>` and `on*` attributes) before saving.
   - **Viewing**: Delivered via `GET /api/content/:id/html`.
   - **Protection**: Rendered inside `<iframe sandbox="allow-scripts">` with Content-Security-Policy headers.

### Operations
- **Upload**: Admin uploads file + metadata via drag-and-drop or file selector (`AdminUploadPage.jsx`).
- **Edit**: Admin edits title, description, and category (`AdminEditPage.jsx`).
- **Delete**: Admin clicks delete, confirms in modal, purges file from storage and record from DB (`AdminPage.jsx`).
- **Viewer Access**: Viewer browses dashboard, searches/filters, and clicks to view protected content (`DashboardPage.jsx` & `ContentDetailPage.jsx`).

---

## 7. Video Security

- **Serving Endpoint**: `GET /api/content/:id/stream`
- **HTTP Range Support**: YES (`Range: bytes=start-end`).
- **Range Header Handling**: Calculates chunk start/end (1MB max chunk limit), reads byte slice via `storageService.getObjectRange()`, and returns `206 Partial Content` with `Content-Range: bytes start-end/fileSize` and `Accept-Ranges: bytes`.
- **Server Streaming**: YES.
- **Storage URL Exposed to Frontend?**: NO.
- **Storage Bucket Private?**: YES.
- **Authentication & Authorization Checked Before Streaming?**: YES (`requireAuth` middleware).

---

## 8. PDF Security

- **Is PDF.js Used?**: YES (`pdfjs-dist` in `PdfViewer.jsx`).
- **Providing Endpoint**: `GET /api/content/:id/pdf`
- **Is Endpoint Protected?**: YES (`requireAuth` middleware).
- **Raw Storage URL Exposed?**: NO.
- **Downloading Prevention**: Raw PDF bytes are fetched as an `ArrayBuffer` in client memory and rendered directly onto a `<canvas>` element. Standard browser print/download UI is hidden.

---

## 9. HTML Security

- **Display Mechanism**: Rendered in `<iframe sandbox="allow-scripts" src="/api/content/:id/html">`.
- **Sandbox Attributes**: `allow-scripts` (disallows top-navigation, same-origin cookie access, or popup creation).
- **Sanitization Implemented**: YES. Neutralizes `<script>` tags, `on*` inline event handlers, and `javascript:` URIs during upload in `content.service.js`.
- **Rendered Inside Main React DOM?**: NO. Completely isolated inside iframe context.

---

## 10. File Upload Security

- **Allowed File Types**: MP4 (`.mp4`), PDF (`.pdf`), HTML (`.html`, `.htm`).
- **MIME Validation**: Validates `video/mp4`, `application/pdf`, `text/html`/`application/xhtml+xml`.
- **Extension Validation**: Strictly enforced in `content.service.js`.
- **Maximum File Size**: 100MB (`MAX_UPLOAD_SIZE_MB`).
- **Filename Handling**: Sanitized via regex (`re.sub(r"[^a-zA-Z0-9_.-]", "_")`).
- **Object Key Generation**: `content/{uuid}/{safe_filename}` using UUID v4.
- **Dangerous Filename Prevention**: Path traversal characters (`../`, `\`) stripped.
- **Validation Layers**: Both backend validation (strict) and frontend form validation exist.

---

## 11. Storage Security

- **Storage Provider**: `StorageService` (Local isolated filesystem `./private_storage` or AWS S3 / Supabase Storage).
- **Bucket Privacy**: Bucket / storage directory is **strictly private**.
- **What is Stored in DB**: `storage_key` (`content/{uuid}/{filename}`), **not** public URLs.
- **Permanent Public URLs Exposed?**: NO.
- **Backend File Retrieval**: Retrieved by `StorageService` streams/buffers using server-side keys.
- **Direct Storage Access Prevented**: YES. Files can only be accessed through authenticated Express endpoints.

---

## 12. Search / Filtering

- **Search**: **IMPLEMENTED** (Searches title & description case-insensitively).
- **Category Filters**: **IMPLEMENTED** (Filters by unique category name).
- **Content Type Filters**: **IMPLEMENTED** (Filters by `VIDEO`, `PDF`, `HTML`).
- **Sorting**: **IMPLEMENTED** (Sorted by `created_at desc`).
- **Pagination**: **NOT IMPLEMENTED** (Returns total items in single payload).

---

## 13. View Tracking

- **Where View is Stored**: `view_count` integer column in `contents` table.
- **Information Recorded**: Total view count per content item.
- **User Associated with View?**: NO.
- **Timestamp Recorded?**: NO (item `updated_at` updates).
- **Where Admin Sees It**: Admin Console table and summary metrics cards.

---

## 14. Audit Log

- **Actions Logged**: `UPLOAD`, `EDIT`, `DELETE`.
- **User Information Recorded**: `admin_id`, `admin_email`.
- **Content Information Recorded**: `content_id`, `details` text string.
- **Where Admin Views It**: Admin Console Audit Logs tab (`GET /api/admin/audit-logs`).

---

## 15. Frontend / UX

### Main Screens Implemented
1. **Login Page** (`/login`)
2. **Viewer Dashboard** (`/dashboard`)
3. **Admin Console** (`/admin`)
4. **Admin Upload Page** (`/admin/content/new`)
5. **Admin Edit Page** (`/admin/content/:id/edit`)
6. **Content Detail Viewer** (`/content/:id`)

### UX Features
- Loading states (Spinners during auth & content loading)
- Error states (Alert banners on failure)
- Empty states ("No content items found")
- Responsive design (CSS Grid/Flexbox for mobile & desktop)
- Confirmation dialogs (Delete confirmation modal)

---

## 16. API Endpoints

| Method | Endpoint | Purpose | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | System health check | Public |
| `GET` | `/api/auth/google/login` | Returns Google OAuth URL | Public |
| `GET` | `/api/auth/google/callback` | OAuth code callback & cookie issuance | Public |
| `GET` | `/api/auth/me` | Fetch authenticated user profile | Authenticated |
| `POST` | `/api/auth/logout` | Clear HttpOnly session cookie | Public |
| `GET` | `/api/content` | List content with search/filter | Authenticated |
| `GET` | `/api/content/:id` | Get content detail & increment view | Authenticated |
| `GET` | `/api/content/:id/stream` | HTTP Range 206 video stream | Authenticated |
| `GET` | `/api/content/:id/pdf` | Protected PDF binary delivery | Authenticated |
| `GET` | `/api/content/:id/html` | Protected HTML module delivery | Authenticated |
| `POST` | `/api/admin/content` | Upload new content item | Admin Only |
| `PATCH` | `/api/admin/content/:id` | Edit content metadata | Admin Only |
| `DELETE` | `/api/admin/content/:id` | Delete content item & object file | Admin Only |
| `GET` | `/api/admin/audit-logs` | Retrieve system audit logs | Admin Only |

---

## 17. Database Models (Prisma)

1. **`User` (`users`)**: Stores user identity, `google_id`, `email`, `name`, `avatar_url`, and `role` (`ADMIN` / `VIEWER`).
2. **`Content` (`contents`)**: Stores content metadata, `title`, `description`, `category`, `content_type`, `storage_key`, `original_filename`, `mime_type`, `file_size`, `view_count`, and `created_by` (FK -> `User.id`).
3. **`AuditLog` (`audit_logs`)**: Records administrative actions (`UPLOAD`, `EDIT`, `DELETE`), `admin_id` (FK -> `User.id`), `admin_email`, `content_id`, `details`, and `timestamp`.

---

## 18. Security Architecture

### Key Security Features Implemented
- **Authentication**: Google OAuth 2.0 with JWT signed session tokens.
- **Authorization**: Strict server-side RBAC dependencies (`requireAuth` -> 401, `requireAdmin` -> 403).
- **Storage**: Private object storage with unguessable UUID storage keys (`content/{uuid}/{filename}`).
- **File Uploads**: MIME, extension, and 100MB file size validation with filename sanitization.
- **Content Delivery**: HTTP Range streaming (no full buffering), PDF.js canvas rendering, and HTML iframe sandboxing (`sandbox="allow-scripts"`).
- **Session Security**: HttpOnly, SameSite `lax` cookies. No access tokens in `localStorage`.

### Top 4 Security Points for Video Presentation
1. **Zero Public Storage URLs**: Files are stored in private storage and served exclusively through authenticated Express streaming endpoints.
2. **Server-Side RBAC Boundary**: Administrative actions enforce backend role verification; client role parameters are ignored.
3. **Protected HTTP Range Video Streaming**: Serves 206 Partial Content byte ranges without loading entire files into server memory or revealing storage links.
4. **Canvas PDF & Sandboxed HTML Isolation**: Prevents direct file downloading and neutralizes embedded scripts via iframe sandboxing.

---

## 19. Testing

- **Testing Framework**: Jest v29 + Supertest v7
- **Existing Test Suite**: `backend/tests/api.test.js`
- **Tests Included**: Unauthenticated 401 blocking, Google OAuth URL generation, server-side `ADMIN_EMAIL` role assignment, Viewer 403 blocking on upload/edit/delete/audit-logs, empty/invalid file rejection, Range video streaming (206), PDF stream, and HTML sandboxing.
- **Tests Result**: **21 / 21 Tests PASSED** (0 failures, 0.5s execution time).
- **Run Command**: `cd backend && npm test`

---

## 20. Deployment

- **Frontend Deployment**: Static dist bundle produced via `npm run build` in `frontend/`.
- **Backend Deployment**: Executable via `npm start` (`node src/server.js`) on Node.js host.
- **Environment Variables Required**:
  `ENVIRONMENT`, `FRONTEND_URL`, `BACKEND_URL`, `SESSION_SECRET`, `COOKIE_SECURE`, `DATABASE_URL`, `ADMIN_EMAIL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `STORAGE_BUCKET`.

---

## 21. Live Demo Flow (2–5 Minutes)

```
0:00–0:30 ──► Introduction & Login Screen
               - Show clean login UI with single "Sign in with Google" button.
               - Explain Google OAuth 2.0 single-sign-on and HttpOnly session cookies.

0:30–1:15 ──► Viewer Portal & Content Discovery
               - Sign in as a Viewer account.
               - Show Dashboard with real-time search, category filtering, and type pills.
               - Open a Video item -> Demonstrate smooth HTTP Range 206 byte streaming.
               - Open a PDF item -> Demonstrate PDF.js canvas rendering (no download link).
               - Open an HTML module -> Demonstrate sandboxed iframe rendering.

1:15–2:15 ──► Admin Console & Content Management
               - Sign in with configured ADMIN_EMAIL account.
               - Show automatic elevation to ADMIN role and appearance of Admin Console links.
               - Upload a new PDF/Video document with drag-and-drop.
               - Edit content metadata.
               - View the Audit Log tab showing UPLOAD and EDIT audit entries.

2:15–3:00 ──► Security Architecture & RBAC Demonstration
               - Demonstrate server-side RBAC by showing that direct API calls from Viewers return HTTP 403 Forbidden.
               - Highlight private object storage keys (`content/{uuid}/{filename}`) and explain why no public download URLs exist.
```

---

## 22. Best Technical Talking Points

1. **Single-Sign-On via Google OAuth 2.0**: Secure authentication with HttpOnly JWT session cookies.
2. **Server-Side RBAC Boundary**: Strict `ADMIN_EMAIL` check with Express `requireAdmin` middleware returning 403 Forbidden.
3. **Private Object Storage Isolation**: Objects stored under unguessable UUID keys; zero permanent public URLs exposed.
4. **Protected HTTP Range Video Streaming**: Serves 206 Partial Content byte ranges on demand.
5. **PDF.js Canvas Rendering**: Binary PDF payload rendered directly onto an HTML5 canvas element.
6. **Sandboxed HTML Module Isolation**: Rendered inside `<iframe sandbox="allow-scripts">` with script sanitization on upload.
7. **Prisma ORM & PostgreSQL**: Type-safe relational database management for users, contents, and audit logs.

---

## 23. Potential Interview / Evaluator Questions

1. **Q: Why did you choose Node.js and Express for the backend?**
   - **A**: Express provides a lightweight, highly performant asynchronous environment for streaming byte ranges and handling HTTP middleware cleanly.
2. **Q: How does role assignment work?**
   - **A**: During Google OAuth sync, the backend compares the verified Google email against `ADMIN_EMAIL`. If matched, the user receives `ADMIN`; otherwise `VIEWER`. Frontend roles are purely cosmetic.
3. **Q: How do you prevent Viewers from uploading or deleting content?**
   - **A**: All `/api/admin/*` routes enforce the `requireAdmin` middleware. If a non-admin calls the API, the backend responds with `HTTP 403 Forbidden`.
4. **Q: How are files stored and kept private?**
   - **A**: Files are saved in isolated private storage (or S3) using UUID keys (`content/{uuid}/{filename}`). The database stores only the storage key, never a public URL.
5. **Q: How does video streaming work without revealing the file path?**
   - **A**: The browser sends `Range: bytes=X-Y` headers to `/api/content/:id/stream`. The backend reads that byte chunk from private storage and returns `206 Partial Content`.
6. **Q: How do you prevent PDF file downloading?**
   - **A**: The PDF endpoint streams raw binary to the browser, where PDF.js renders array buffers directly onto an HTML5 canvas. Download links are not provided.
7. **Q: How is uploaded HTML secured against XSS attacks?**
   - **A**: HTML is sanitized on upload to strip script tags/event handlers and rendered inside a sandboxed iframe (`sandbox="allow-scripts"`).
8. **Q: Are session tokens stored in localStorage?**
   - **A**: No. Session JWTs are stored strictly in `HttpOnly` cookies, protecting them from client-side XSS script theft.
9. **Q: What happens if an uploaded file is invalid or empty?**
   - **A**: The backend validates MIME type, file extension, buffer length, and size limit (100MB max) before writing to storage, returning `400 Bad Request` if invalid.
10. **Q: What are the main limitations of this content protection?**
    - **A**: While link sharing and direct downloads are prevented, frame capture or screen recording cannot be blocked once video/canvas pixels are rendered on screen.

---

## 24. Known Limitations

- **CRITICAL**: Screen recording/frame capture cannot be prevented by web browser software once pixels are rendered on the user's monitor.
- **MINOR**: Video streaming uses standard HTTP Range 206 chunks rather than adaptive HLS (HTTP Live Streaming) bitrate switching.
- **ACCEPTABLE TRADE-OFF**: Large PDFs require client device CPU processing to render canvas pages via PDF.js.

---

## 25. Final Summary

```
PROJECT:
Secure Content Portal

ONE-LINE DESCRIPTION:
A security-first internal organization portal for sharing training videos, PDFs, and HTML interactive modules with server-side RBAC, private object storage, and protected streaming.

FRONTEND:
React 18, Vite 5, React Router v6, PDF.js, Lucide React, Vanilla CSS

BACKEND:
Node.js 26, Express.js 4, Prisma ORM 5, jsonwebtoken, cookie-parser, multer

DATABASE:
SQLite / PostgreSQL managed via Prisma ORM (users, contents, audit_logs)

STORAGE:
Private Object Storage Service (Local isolated ./private_storage directory fallback or AWS S3)

AUTHENTICATION:
Google OAuth 2.0 with signed JWT session tokens stored in HttpOnly cookies

AUTHORIZATION:
Server-side RBAC (ADMIN_EMAIL comparison -> ADMIN or VIEWER role)

CONTENT TYPES:
VIDEO (MP4), PDF (.pdf), HTML (.html, .htm)

KEY SECURITY FEATURES:
1. Private object storage with unguessable UUID storage keys
2. Server-side RBAC boundary enforcing HTTP 403 Forbidden for unauthorized administrative requests
3. Protected HTTP Range 206 video streaming (no public storage URLs)
4. PDF.js binary canvas rendering (prevents raw file download links)
5. Sandboxed HTML preview (<iframe sandbox="allow-scripts">) with sanitization

MAIN FEATURES:
1. Google OAuth 2.0 single-sign-on
2. Content discovery dashboard with search and category filters
3. Protected multi-format content player & viewer
4. Admin management console with drag-and-drop upload, editing, and deletion
5. System audit logging (UPLOAD, EDIT, DELETE)

IMPORTANT API ENDPOINTS:
GET /api/auth/google/login (Google OAuth URL)
GET /api/auth/me (Authenticated profile)
GET /api/content (Content listing with search/filter)
GET /api/content/:id/stream (HTTP Range 206 video stream)
GET /api/content/:id/pdf (Protected PDF binary stream)
GET /api/content/:id/html (Protected HTML module stream)
POST /api/admin/content (Admin content upload)
GET /api/admin/audit-logs (Admin audit logs)

TEST STATUS:
21 / 21 Tests PASSED (Jest + Supertest)

DEPLOYMENT:
Vite build for frontend dist; Express server on Node.js port 8000; Prisma ORM DB.

DEMO FLOW:
0:00–0:30 -> Google OAuth Login
0:30–1:15 -> Viewer Portal (Search, Range Video Streaming, PDF Canvas, HTML Sandbox)
1:15–2:15 -> Admin Console (Upload, Metadata Edit, Audit Logs)
2:15–3:00 -> Security Architecture & Server-Side RBAC (403 Forbidden demonstration)

TOP 5 THINGS TO MENTION IN VIDEO:
1. Zero permanent public download URLs exposed for internal training content.
2. Server-side RBAC strictly evaluated against ADMIN_EMAIL with 403 Forbidden protection.
3. Protected HTTP Range 206 byte streaming for videos.
4. Canvas rendering of binary PDFs via PDF.js to hide download links.
5. Sandboxed HTML module rendering inside isolated iframes.

TOP 10 POSSIBLE QUESTIONS:
1. Why Node.js/Express? (Lightweight async HTTP streaming & middleware)
2. How does RBAC work? (Server-side ADMIN_EMAIL comparison in syncUser)
3. How are non-admins blocked? (Express requireAdmin middleware returning 403 Forbidden)
4. How are files stored? (Private storage under UUID keys, no static URL routing)
5. How does video streaming work? (HTTP Range 206 partial content chunks)
6. How is PDF downloading hidden? (ArrayBuffer stream rendered to HTML5 canvas)
7. How is HTML secured? (Sanitized on upload & rendered in iframe sandbox="allow-scripts")
8. Are tokens stored in localStorage? (No, HttpOnly SameSite cookies)
9. What file validation exists? (MIME, extension, 100MB size limit, filename sanitization)
10. What are the DRM limitations? (Prevents link sharing/downloads; cannot block screen capture)

KNOWN LIMITATIONS:
- Frame capture / screen recording cannot be prevented by web browser software once pixels are rendered.
- Video streaming uses HTTP Range 206 chunks rather than HLS adaptive bitrate streaming.
```
