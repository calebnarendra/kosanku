const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const swaggerUi = require('swagger-ui-express');
const ensureDatabaseSchema = require('./config/initDb');
const openApiSpec = require('./openapi');

const authRoutes = require('./routes/authRoutes');
const roomRoutes = require('./routes/roomRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const providerRoutes = require('./routes/providerRoutes');
const studentRoutes = require('./routes/studentRoutes');
const conversationRoutes = require('./routes/conversationRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

function isPrivateNetworkHost(hostname) {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
  );
}

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;

  try {
    const { hostname } = new URL(origin);
    return isPrivateNetworkHost(hostname);
  } catch (_error) {
    return false;
  }
}

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked origin: ${origin}`));
    },
  })
);
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));

app.get('/', (_req, res) => {
  res.type('html').send(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>KosanKu Backend</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f8fafc;
        --panel: #ffffff;
        --text: #111827;
        --muted: #6b7280;
        --line: rgba(148, 163, 184, 0.28);
        --primary: #c95f76;
        --primary-soft: #f9dbe2;
        --green: #166534;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: Inter, Arial, sans-serif;
        background: var(--bg);
        color: var(--text);
      }
      .shell {
        max-width: 1100px;
        margin: 0 auto;
        padding: 32px 20px 56px;
      }
      .hero, .card {
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 24px;
        box-shadow: 0 18px 40px rgba(15, 23, 42, 0.06);
      }
      .hero {
        padding: 28px;
        margin-bottom: 20px;
      }
      .eyebrow {
        margin: 0 0 8px;
        color: var(--muted);
        font-size: 13px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      h1, h2, h3, p { margin: 0; }
      .hero-copy {
        margin-top: 12px;
        color: var(--muted);
        max-width: 760px;
        line-height: 1.6;
      }
      .grid {
        display: grid;
        grid-template-columns: 1.1fr 0.9fr;
        gap: 20px;
      }
      .card {
        padding: 24px;
      }
      .stack {
        display: grid;
        gap: 14px;
      }
      .route {
        padding: 14px 16px;
        border-radius: 18px;
        background: #fafafa;
        border: 1px solid var(--line);
      }
      .route strong {
        display: block;
        margin-bottom: 6px;
      }
      .pill {
        display: inline-flex;
        margin-top: 10px;
        padding: 8px 12px;
        border-radius: 999px;
        font-weight: 700;
        font-size: 14px;
        background: #dcfce7;
        color: var(--green);
      }
      .action-row {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 18px;
      }
      .action {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 12px 16px;
        border-radius: 14px;
        background: var(--primary);
        color: white;
        text-decoration: none;
        font-weight: 700;
      }
      .action.secondary {
        background: var(--primary-soft);
        color: #8b3046;
      }
      code {
        background: #f1f5f9;
        padding: 2px 6px;
        border-radius: 8px;
      }
      ul {
        margin: 0;
        padding-left: 18px;
        color: var(--muted);
      }
      li + li {
        margin-top: 8px;
      }
      @media (max-width: 820px) {
        .grid {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <main class="shell">
      <section class="hero">
        <p class="eyebrow">Backend landing page</p>
        <h1>KosanKu API</h1>
        <p class="hero-copy">
          Your frontend app is on <strong>http://localhost:3001</strong>. This backend lives on port 3000 and now includes an interactive API explorer.
        </p>
        <span class="pill">API is running</span>
        <div class="action-row">
          <a class="action" href="/api-docs">Open Interactive API Docs</a>
          <a class="action secondary" href="/openapi.json">Open OpenAPI JSON</a>
          <a class="action secondary" href="/api/health">Health Check</a>
        </div>
      </section>

      <section class="grid">
        <article class="card stack">
          <div>
            <h2>Main API groups</h2>
            <p class="hero-copy">Everything below is still the same backend API. The docs page just makes it easier to browse and test.</p>
          </div>

          <div class="route"><strong>Auth</strong><span>/api/auth/register, /api/auth/login, /api/auth/me, /api/auth/profile, /api/auth/password, /api/auth/account</span></div>
          <div class="route"><strong>Rooms</strong><span>/api/rooms, /api/rooms/:id</span></div>
          <div class="route"><strong>Bookings</strong><span>/api/bookings, /api/bookings/:id/cancel, /api/bookings/:id/status</span></div>
          <div class="route"><strong>Student dashboard</strong><span>/api/student/bookings</span></div>
          <div class="route"><strong>Provider dashboard</strong><span>/api/provider/rooms, /api/provider/bookings</span></div>
        </article>

        <article class="card stack">
          <div>
            <h2>How to use the docs page</h2>
            <p class="hero-copy">Swagger UI lets you open each endpoint, see the request body shape, and test protected routes after authorizing with a JWT token from login.</p>
          </div>
          <ul>
            <li>Open <code>/api-docs</code></li>
            <li>Use <code>POST /api/auth/login</code> first</li>
            <li>Copy the token from the response</li>
            <li>Click <strong>Authorize</strong> and paste <code>Bearer YOUR_TOKEN</code></li>
            <li>Now you can try the protected routes from the same page</li>
          </ul>
        </article>
      </section>
    </main>
  </body>
</html>`);
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/openapi.json', (_req, res) => {
  res.json(openApiSpec);
});

app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(openApiSpec, {
    explorer: true,
    customSiteTitle: 'KosanKu API Docs',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'list',
      defaultModelsExpandDepth: 1,
      filter: true,
    },
  })
);

app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/provider', providerRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/notifications', notificationRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  const message = error.message || 'Internal server error';
  res.status(500).json({ error: message });
});

async function bootstrap() {
  await ensureDatabaseSchema();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend running at http://0.0.0.0:${PORT}`);
    console.log(`Interactive docs at http://0.0.0.0:${PORT}/api-docs`);
    console.log(`For phone access, use http://YOUR_LAPTOP_IP:${PORT}`);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start backend:', error);
  process.exit(1);
});
