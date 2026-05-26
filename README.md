# KosanKu

KosanKu is a full-stack room-rental platform for college students and room providers. It supports two roles in one product:

- **Student**: browse rooms, filter listings, inspect room details, send booking requests, track booking status, and manage profile data.
- **Provider**: create and edit room listings, review incoming requests, accept or reject bookings, and monitor room occupancy.

The project is packaged as a Dockerized monorepo with a React frontend, an Express.js backend, and a PostgreSQL database.

## What this folder contains

```text
project_PL/
├── docker-compose.yml
├── README.md
├── database/
│   └── schema.sql
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── database/
│   ├── middleware/
│   ├── routes/
│   ├── openapi.js
│   ├── index.js
│   ├── package.json
│   └── Dockerfile
└── frontend/
    ├── public/
    ├── src/
    ├── package.json
    └── Dockerfile
```

## What the system does

### Student-side workflow

Students can:

- register and log in
- edit their profile and password
- browse available rooms
- filter rooms by location, price range, amenities, type, and earliest move-in date
- open room details
- submit booking requests with move-in date, move-out date, and notes
- track pending, accepted, denied, or cancelled requests
- cancel pending requests

### Provider-side workflow

Providers can:

- register and log in
- edit their profile and password
- create room listings
- edit room listings
- upload room photos
- define room count, availability date, description, type, and price
- view incoming booking requests
- accept or reject requests
- review request history
- see accepted occupants in each room

## Main technologies

- **Frontend**: React 18 + Axios + plain CSS
- **Backend**: Express.js + JWT authentication + Swagger UI
- **Database**: PostgreSQL 15
- **Container orchestration**: Docker Compose

## How the architecture works

1. The **frontend** runs on port `3001` and calls the backend through Axios.
2. The **backend** runs on port `3000`, exposes REST API routes under `/api`, and serves interactive API docs.
3. The **database** runs on PostgreSQL port `5432` and stores users, rooms, and bookings.
4. Docker Compose starts all three services together and wires the containers to each other.

## Accessible URLs

### User-facing

- `http://localhost:3001` — main KosanKu frontend

### Backend utilities

- `http://localhost:3000/` — readable backend landing page
- `http://localhost:3000/api/health` — health check endpoint
- `http://localhost:3000/api-docs` — interactive API documentation (Swagger UI)
- `http://localhost:3000/openapi.json` — raw OpenAPI specification

### Database

- `localhost:5432` — PostgreSQL port

## Main API groups

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `PUT /api/auth/profile`
- `PUT /api/auth/password`
- `DELETE /api/auth/account`

### Rooms

- `GET /api/rooms`
- `GET /api/rooms/:id`
- `POST /api/rooms`
- `PUT /api/rooms/:id`
- `GET /api/provider/rooms`

### Bookings

- `POST /api/bookings`
- `PATCH /api/bookings/:id/cancel`
- `PATCH /api/bookings/:id/status`
- `GET /api/student/bookings`
- `GET /api/provider/bookings`

## Data model summary

### `users`
Stores both students and providers.

Key fields include:

- `name`
- `email`
- `password`
- `role`
- `phone`
- `age`
- `gender`
- `profile_image_url`

### `rooms`
Stores provider room listings.

Key fields include:

- `provider_id`
- `title`
- `description`
- `location`
- `address`
- `price_per_month`
- `available_from`
- `allowed_gender`
- `room_count`
- `documentation_urls`

### `bookings`
Stores booking requests and booking lifecycle state.

Key fields include:

- `room_id`
- `student_id`
- `status`
- `message`
- `move_in_date`
- `move_out_date`
- `provider_response_note`
- `requested_at`
- `responded_at`

## Important behaviors built into the app

### Role-based access control

Protected routes require a JWT token and role checks:

- student-only actions are limited to students
- provider-only actions are limited to providers

### Live-ish dashboard updates

The frontend refreshes key student/provider data every 5 seconds on relevant pages so that booking state and room state stay current without manual refresh.

### Derived slot availability

Room availability is not just the original room count. The backend subtracts active requests and accepted occupants when calculating remaining slots.

### Cancel/accept/reject lifecycle

Booking records move through states such as:

- `pending`
- `accepted`
- `rejected`
- `cancelled`

### Interactive backend docs

Swagger UI is mounted at `/api-docs` so the API can be browsed and tested directly in the browser.

## Running the project

### Recommended: Docker Compose

From the project root:

```bash
/docker compose up --build
```

Use this instead in normal shells:

```bash
docker compose up --build
```

### Run frontend and backend without Docker

#### Backend

```bash
cd backend
npm install
npm start
```

#### Frontend

```bash
cd frontend
npm install
npm start
```

The frontend expects the backend API at `http://localhost:3000/api`.

## Notes on persistence and safety

The Compose file uses a named Docker volume called `postgres_data` for PostgreSQL storage. That means data should survive normal container stop/start cycles.

Safe operations:

- `docker compose stop`
- `docker compose start`
- `docker compose down`

Destructive operation:

- `docker compose down -v`

`down -v` removes named volumes and can wipe the database.

## Notes on images and request size

Room and profile photos are currently handled as device uploads encoded into request payloads. The backend JSON body limit is set to **2 MB** to allow these uploads.

For a larger production system, a dedicated file-upload/storage solution would be more scalable.

## Interactive API usage

Suggested first tests in `/api-docs`:

1. `GET /api/health`
2. `POST /api/auth/login`
3. `GET /api/rooms`

To test protected routes:

1. log in through `POST /api/auth/login`
2. copy the returned JWT token
3. click **Authorize** in Swagger UI
4. paste `Bearer YOUR_TOKEN`
5. execute protected endpoints

## Current implementation notes

- UI styling is built with regular CSS, not Tailwind.
- The frontend includes page transitions and role-specific dashboards.
- The backend auto-runs schema initialization logic on startup.
- The backend also serves a readable landing page on `/`.

## Suggested future improvements

- map-based address picker for providers
- real multipart file uploads instead of base64-style payloads
- WebSocket or Server-Sent Events for real-time updates instead of polling
- automated backups for PostgreSQL
- better separation of development and production secrets
