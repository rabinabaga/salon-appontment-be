# Salon Appointment & Time Slot Management System

A production-grade salon booking system built with NestJS, PostgreSQL, BullMQ, and WebSockets.

---

## Tech Stack

- **Backend:** NestJS, TypeScript, PostgreSQL, TypeORM
- **Queue:** BullMQ + Redis
- **Real-time:** WebSockets (Socket.io)
- **Email:** Nodemailer
- **Frontend:** Next.js (React), Tailwind CSS
- **Documentation:** Swagger
- **File Processing:** ExcelJS

---

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL
- Redis

### Installation

```bash
git clone <repo-url>
cd salon-appointment-system
npm install
cp .env.example .env
# Fill in your environment variables
npm run migration:run
npm run seed
npm run start:dev
```

### Environment Variables

```env
DATABASE_URL=postgresql://user:password@localhost:5432/salon
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=1d
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your_email
MAIL_PASS=your_password
MAIL_FROM=noreply@salon.com
FRONTEND_URL=http://localhost:3001
PORT=3000
```

---

## Architecture Overview

### System Design

```
Client (Next.js)
    │
    ├── HTTP Requests → NestJS REST API
    │                       │
    │                       ├── PostgreSQL (persistent data)
    │                       ├── Redis (BullMQ queues + cache)
    │                       └── Nodemailer (email)
    │
    └── WebSocket → NestJS Gateway
                        │
                        └── Emits real-time job progress
```

### Request Flow

Every request passes through the following NestJS layers in order:

```
Middleware → Guards → Interceptors (pre) → Pipes → Controller → Interceptors (post) → Response
```

- **Middleware** — JWT extraction, request logging
- **Guards** — authentication and role-based access control (RBAC)
- **Interceptors** — request/response transformation
- **Pipes** — DTO validation via class-validator

---

## Architectural Decisions

### 1. Services are dynamic, not hardcoded enums
The task mentions "haircuts, manicures, spa, etc." — the "etc." signals extensibility. Services are managed via staff CRUD APIs instead of hardcoded enum values, allowing new services to be added without code changes.

### 2. One service provider per service type
The task does not mention multiple staff members. The system assumes one slot per service at a time. This can be extended to support multiple staff per service by introducing a `staff` table with service assignments.

### 3. Appointment updates only allowed on PENDING status
Confirmed appointments cannot be updated — they must be cancelled and rebooked. This prevents slot conflicts and invalidated confirmation emails.

**Status flow:** `PENDING → CONFIRMED → CANCELLED`

### 4. Service duration snapshotted at booking time
Duration is stored directly on the appointment at the time of booking, not referenced from the service table. This prevents existing appointments from breaking if a service's duration is changed in the future.

### 5. Notifications are sent via email (Nodemailer)
The task does not specify a notification channel. Email via Nodemailer was chosen as the standard approach.

### 6. Bulk Excel file contains external customer data
The Excel upload is assumed to contain external customer appointments (customerName, customerEmail, service, date, time) that may not be registered users in the system.

### 7. Single appointment confirmation email on status change
When staff confirms a single appointment, one confirmation email is sent automatically via BullMQ. This is intentionally asynchronous to avoid blocking the HTTP response.

### 8. Template selection is a settings page, not post-login redirect
Notification template selection is accessible from the navigation menu at any time. The active template is persisted in a settings table and used for all outgoing confirmation emails.

### 9. WebSockets only for bulk job processing
WebSocket events are emitted during bulk notification job processing. Both the upload page and the logs page consume the same socket events. If the client disconnects, job results are persisted in the database and viewable in the logs page after reconnection.

### 10. BullMQ concurrency set to 5
Concurrency of 5 was chosen to balance processing speed with SMTP provider rate limits. Increasing this value risks email delivery failures from provider throttling.

### 11. Only registered and email-verified users can book
Guest booking is not supported. Authentication is required for all appointment operations.

### 12. Two roles — Customer and Staff
- **Customer** — registers, books appointments, views own appointments
- **Staff** — manages all appointments, confirms/cancels, uploads Excel, selects notification templates, views logs

### 13. Break period applies to all days
The 12:00 PM to 2:00 PM break period applies every day. Holiday management is out of scope for the current implementation and noted as a future enhancement.

---

## Database Schema

```
users: id, name, email, password, role, address, isEmailVerified, createdAt
services: id, name, duration (minutes), price, isActive, createdAt
appointments: id, userId, serviceId, date, startTime, endTime, duration (snapshot), status, confirmedAt, createdAt
notification_templates: id, name, subject, body, createdAt
bulk_jobs: id, uploadedBy, fileUrl, status, totalRows, processedCount, successCount, failCount, createdAt
notification_logs: id, bulkJobId, customerEmail, customerName, service, date, status, errorMessage, processedAt
settings: id, activeTemplateId
```

---

## API Documentation

Swagger documentation available at: `http://localhost:3000/api`

---

## Features

- User registration with email verification
- JWT authentication with role-based access control (RBAC)
- Dynamic service management (staff CRUD)
- Appointment booking with real-time slot availability
- Overlap detection and break period enforcement
- Single appointment confirmation with automatic email
- Bulk appointment notification via Excel upload
- BullMQ async processing with concurrency of 5
- Real-time WebSocket updates for bulk job progress
- Appointment confirmation logs with per-row status
- Notification template management with preview
- Database migrations with TypeORM
- Global exception handling
- Rate limiting via NestJS Throttler
- Security headers via Helmet
- Input validation via class-validator

---

## Future Enhancements

- Multiple staff per service type
- Holiday/day-off management
- Customer self-service cancellation
- Appointment reminders (scheduled BullMQ jobs)
- WebSocket updates for individual appointment status changes
- SMS notifications