# KosanKu Private Guide

This file is a private explainer for the project. It is not meant as a public README. It explains the important building blocks, what they mean, what they do in this project, and how to think about them with simple analogies.

## Big-picture view

KosanKu is one app with three big parts:

1. **Frontend** — what users see and click
2. **Backend** — the rule engine and traffic controller
3. **Database** — the long-term memory

### Analogy

Imagine KosanKu as a boarding-house office:

- the **frontend** is the reception desk and the forms people fill out
- the **backend** is the staff behind the desk who check rules and process requests
- the **database** is the filing cabinet where all records are stored

---

## 1. React

### What it is

React is a JavaScript library for building user interfaces.

### What it does here

The frontend is built in React and lives in `frontend/src/App.js`. It controls:

- login/register flow
- student dashboard
- provider dashboard
- profile pages
- search page
- request details page
- room creation/edit pages

### Structural meaning

React organizes the UI as state-driven views. Instead of writing a separate HTML page for each screen, the app changes what it renders based on state like:

- who is logged in
- what role they have
- what page is active
- what room or booking is selected

### Analogy

React is like a stage crew changing the scene on one theater stage. The stage is still the same place, but the props and lighting change depending on the current act.

---

## 2. Express.js

### What it is

Express.js is a Node.js web framework for handling HTTP requests and responses.

### What it does here

The backend uses Express to expose routes like:

- `/api/auth/login`
- `/api/rooms`
- `/api/bookings`
- `/api/provider/bookings`

It also serves:

- `/` for the backend landing page
- `/api-docs` for interactive API docs
- `/openapi.json` for the machine-readable API spec

### Structural meaning

Express is the layer that receives requests from the frontend, decides which controller should handle them, and sends data back.

### Analogy

Express is the receptionist who receives each request, checks which department should handle it, and forwards it to the right person.

---

## 3. PostgreSQL

### What it is

PostgreSQL is a relational database.

### What it does here

It stores three main kinds of records:

- users
- rooms
- bookings

### Structural meaning

The database is the source of truth. If the frontend refreshes, the app should still know the same users, rooms, and booking states because they are stored in PostgreSQL.

### Analogy

PostgreSQL is the filing cabinet that keeps official records. Even if the office lights turn off and back on, the files stay in the cabinet.

---

## 4. Docker Compose

### What it is

Docker Compose starts multiple containers together and connects them.

### What it does here

It runs:

- the PostgreSQL database container
- the Express backend container
- the React frontend container

### Structural meaning

Instead of starting three separate systems manually, Compose defines all of them in one `docker-compose.yml` file.

### Analogy

Docker Compose is the building manager who opens the office, the storage room, and the front desk together in one routine.

---

## 5. Axios

### What it is

Axios is an HTTP client library used by the frontend.

### What it does here

The frontend uses Axios to send requests to the backend, for example:

- login
- load rooms
- create booking
- update profile
- submit/edit room

The project also uses an Axios interceptor to automatically attach the JWT token from local storage to protected requests.

### Analogy

Axios is the courier carrying forms between the reception desk and the back office.

---

## 6. JWT (JSON Web Token)

### What it is

A JWT is a signed token used to prove who the current user is.

### What it does here

After login, the backend returns a token. The frontend stores it and sends it with later requests so the backend knows:

- which user is acting
- whether they are a student or provider

### Structural meaning

The token is how the app keeps a logged-in session without asking for username/password every time.

### Analogy

A JWT is like a stamped visitor pass. Once the office issues it, the user can show it to access the right doors.

---

## 7. Role-based access control

### What it is

Role-based access control means different users are allowed to do different actions depending on role.

### What it does here

- students can request rooms and manage bookings
- providers can create/edit rooms and manage booking decisions

### Structural meaning

The backend middleware checks the authenticated user’s role before allowing protected actions.

### Analogy

It is like color-coded staff badges: one badge opens the student desk, another badge opens the provider office.

---

## 8. Controllers

### What they are

Controllers are backend functions that contain the main logic for a route.

### What they do here

- `authController.js` handles login, registration, profile updates, password changes, and account deletion
- `roomController.js` handles room listing, detail loading, room creation, room editing, and provider room views
- `bookingController.js` handles booking creation, cancellation, listing, acceptance, and rejection

### Analogy

Controllers are the actual staff members doing the work after the receptionist routes the request to them.

---

## 9. Routes

### What they are

Routes map a URL and HTTP method to a controller function.

### What they do here

Examples:

- `POST /api/auth/login` → log in
- `GET /api/rooms` → list rooms
- `PATCH /api/bookings/:id/status` → accept or deny a booking

### Analogy

Routes are like labeled doors in an office building. Each door leads to a different function.

---

## 10. Middleware

### What it is

Middleware is code that runs before the main route logic.

### What it does here

The key middleware is the auth middleware that:

- checks whether a token exists
- verifies the token
- attaches the user to the request
- confirms the role when required

### Analogy

Middleware is the security guard checking IDs before someone enters a staff-only room.

---

## 11. Swagger UI

### What it is

Swagger UI is an interactive webpage for browsing and testing API endpoints.

### What it does here

It is available at:

- `http://localhost:3000/api-docs`

There you can:

- see all route groups
- inspect request bodies
- inspect response shapes
- try endpoints directly in the browser
- authorize protected routes using a JWT token

### Structural meaning

Swagger UI reads the OpenAPI definition and turns it into a human-friendly control panel.

### Analogy

Swagger UI is the interactive handbook for the backend. Instead of just reading a list of office procedures, you can press the buttons and try them safely.

---

## 12. OpenAPI

### What it is

OpenAPI is the machine-readable description of the API.

### What it does here

The project uses `backend/openapi.js` to define:

- endpoint groups
- request schemas
- security rules
- route descriptions

It is exposed as:

- `http://localhost:3000/openapi.json`

### Structural meaning

OpenAPI is the blueprint. Swagger UI is the polished viewer built from that blueprint.

### Analogy

OpenAPI is the architectural drawing. Swagger UI is the showroom made from that drawing.

---

## 13. The readable backend landing page

### What it is

The backend root page at `http://localhost:3000/` is a custom HTML page.

### What it does here

It gives a friendly entry point that explains:

- what the backend is
- where the frontend lives
- where to find `/api-docs`
- where to find `/openapi.json`
- how to test protected routes

### Analogy

It is the front signboard outside the office telling you which door to use.

---

## 14. Auto-update system

### What it is

This project uses a lightweight refresh system rather than real-time sockets.

### What it does here

On key student/provider pages, the frontend polls the backend every 5 seconds to refresh booking and room information.

The backend also uses live joins when returning booking and room data, so views reflect the latest profile and room information rather than stale snapshots.

### Structural meaning

This is not full real-time streaming, but it creates “auto-refresh” behavior good enough for the current app.

### Analogy

Instead of having a live phone call always open, the frontend checks in every few seconds: “Anything new?”

---

## 15. Live joins vs copied data

### What it means

A booking record does not have to permanently freeze all room/profile details into separate duplicated text.

### What it does here

Provider request views and student booking views are built with current room/user data joined from the database, so updates to profiles and room info can show up later.

### Analogy

Instead of photocopying a person’s whole profile into every file, the system stores their employee number and looks up the latest record when needed.

---

## 16. Plain CSS styling

### What it is

This frontend uses standard CSS files, not Tailwind.

### What it does here

`App.css` controls:

- colors
- layout
- cards and buttons
- page transitions
- spacing
- role-specific dashboard visuals

### Analogy

Plain CSS is like custom tailoring each piece of clothing by hand, instead of picking from a utility wardrobe system like Tailwind.

---

## 17. Page transitions

### What they are

Small UI animations when switching pages.

### What they do here

The app includes light slide/fade transitions so page changes feel smoother.

### Analogy

Instead of jumping to the next slide instantly, the page glides into place.

---

## 18. Search filters

### What they are

Search filters narrow room results.

### What they do here

The current room search logic maps fields like this:

- `Location` → room location
- `Price Range` → monthly price
- `Amenities` → keywords inside description
- `Type` → allowed gender / room type
- `Move-In Date` → minimum available date

### Analogy

It works like choosing conditions on a shopping site: only show items that match the boxes checked.

---

## 19. Booking lifecycle

### What it is

This is the set of states a booking can pass through.

### What it does here

A booking can be:

- `pending`
- `accepted`
- `rejected`
- `cancelled`

These states control what appears in:

- Active Plan
- Student Bookings
- Provider Requests
- Provider History
- Room slot counts

### Analogy

A booking is like a paper application moving between trays: waiting, approved, denied, or withdrawn.

---

## 20. Slot counting

### What it is

Room availability is not just the raw `room_count` value.

### What it does here

The backend subtracts active demand from room count when calculating remaining slots. Pending and accepted bookings affect remaining slots until they are denied, cancelled, or completed.

### Analogy

If a room has 3 beds and 1 is already reserved, the sign should say 2 left, not 3.

---

## 21. Schema initialization

### What it is

The backend runs setup logic to ensure required tables and columns exist.

### What it does here

`initDb.js` and the schema files help the backend start against both fresh and older databases by creating missing columns and triggers where possible.

### Analogy

It is like opening the office in the morning and checking whether every drawer, label, and form template is in place.

---

## 22. Triggers and `updated_at`

### What they are

PostgreSQL triggers can automatically run logic when rows change.

### What they do here

This project uses triggers to automatically refresh `updated_at` fields when records are updated.

### Analogy

Every time a file is edited, a clerk stamps it with the latest edit time.

---

## 23. Base64/data URL image handling

### What it is

For now, uploaded images are carried in request payloads rather than stored through a full file-storage service.

### What it does here

Room photos and profile photos are handled as large text payloads, which is why the backend JSON size limit was increased to 2 MB.

### Analogy

Instead of mailing a printed photo separately, the whole image is folded into the letter itself.

### Important limitation

This is okay for a prototype, but for bigger production use, proper file uploads are better.

---

## 24. CORS

### What it is

CORS controls which frontends are allowed to call the backend from the browser.

### What it does here

The backend allows requests from `http://localhost:3001`, which is where the React app runs.

### Analogy

CORS is a guest list on the backend’s front door.

---

## 25. Local storage session restore

### What it is

The frontend remembers login state between refreshes.

### What it does here

The JWT token is stored locally and reused so the app can attempt to restore the user session on page reload.

### Analogy

It is like keeping your office pass in your wallet so you do not need to re-register every time you return.

---

## 26. Docker volume persistence

### What it is

A Docker named volume stores database files outside the container lifecycle.

### What it does here

The Postgres data is stored in `postgres_data`, which means normal stop/start operations do not erase the database.

### Analogy

The container is the worker, but the volume is the locked storage room. Even if the worker goes home, the storage room remains.

### Important warning

`docker compose down -v` can remove that storage room.

---

## 27. Why the frontend can be up while login fails

### What it means

The frontend and backend are separate services.

### What it does here

If the frontend loads but login is stuck, it often means the React app is running but the backend API has crashed or is unavailable.

### Analogy

The reception desk can still exist physically even if the back office staff are absent.

---

## 28. How to mentally model the whole project

A simple way to remember it:

- **React** = the visible office
- **Axios** = the messenger
- **Express** = the office manager
- **Controllers** = the workers
- **JWT** = the staff pass
- **PostgreSQL** = the filing cabinet
- **Swagger UI** = the interactive handbook
- **Docker Compose** = the building manager
- **OpenAPI** = the blueprint
- **Auto-refresh polling** = periodic status check-ins

If you keep that model in mind, most of the project will stay easy to reason about.
