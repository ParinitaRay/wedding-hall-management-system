# 💒 Wedding Hall Booking Management System

A full-stack web application for browsing, booking, and managing wedding venues — built with **React**, **Node.js/Express**, and **MySQL**.

---

## ✨ Features

### For Users
- Register and log in securely (JWT + bcrypt)
- Browse active wedding halls with search by name or location
- View hall details — images, capacity, pricing, description
- Pick a date and see real-time available time slots
- Book a slot instantly (transaction-safe — no double bookings)
- View booking history with payment status

### For Admins
- Overview dashboard with live stats (halls, bookings, pending, confirmed)
- **Halls** — Add, edit, delete halls; upload images directly from device
- **Bookings** — View all bookings, filter by status, confirm or cancel, record payments
- **Slots** — Create and delete time slots per hall per date
- **Payments** — Full payment history and total revenue tracker
- **Hall calendar view** — Click any hall as admin to see a monthly calendar of all bookings, color-coded by status (Confirmed / Pending), with customer details on click

---

## 🗂 Project Structure

```
wedding-hall/
├── package.json              # Root — runs all three services concurrently
├── scripts/
│   └── start-mysql.js        # Auto-starts MySQL (Windows / macOS / Linux)
├── backend/
│   ├── server.js
│   ├── .env.example
│   ├── uploads/              # Uploaded hall images (gitignored)
│   ├── config/
│   │   ├── db.js             # MySQL connection pool
│   │   └── setup.sql         # Schema + seed data
│   ├── middleware/
│   │   └── auth.js           # JWT auth + admin guard
│   └── routes/
│       ├── auth.js           # Register / Login
│       ├── halls.js          # Hall CRUD + file upload
│       ├── slots.js          # Time slot management
│       ├── bookings.js       # Bookings + admin calendar endpoint
│       └── payments.js       # Payment tracking
└── frontend/
    └── src/
        ├── api.js
        ├── index.css          # Warm beige/espresso/terracotta theme (Playfair Display + DM Sans)
        ├── context/
        │   └── AuthContext.js
        ├── components/
        │   └── Navbar.js
        └── pages/
            ├── Home.js
            ├── Login.js
            ├── Register.js
            ├── Halls.js           # Browse + search
            ├── HallDetail.js      # User: booking panel / Admin: calendar view
            ├── MyBookings.js      # User booking history
            └── AdminDashboard.js  # Full admin panel (tabbed)
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- MySQL 8

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/wedding-hall-booking-system.git
cd wedding-hall-booking-system
```

### 2. Set up the database

```bash
mysql -u root -p < backend/config/setup.sql
```

This creates the `wedding_hall_db` database with all tables and seeds:
- 3 sample wedding halls
- Sample time slots for the next few days
- A default admin account (see below)

### 3. Configure environment variables

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=wedding_hall_db
JWT_SECRET=any_long_random_string
PORT=5000
```

### 4. Install all dependencies

```bash
npm install
npm run install-all
```

### 5. Start everything

```bash
npm run dev
```

This starts **MySQL**, **backend** (port 5000), and **frontend** (port 3000) concurrently in one terminal with color-coded output.

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:5000 |

---

## 🔐 Default Admin Account

| Field | Value |
|-------|-------|
| Email | admin@weddinghall.com |
| Password | admin123 |

> Change this after first login.

---

## 📡 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/register | — | Register user |
| POST | /api/auth/login | — | Login |
| GET | /api/halls | — | List active halls |
| GET | /api/halls/all | Admin | List all halls |
| GET | /api/halls/:id | — | Hall detail + images |
| POST | /api/halls | Admin | Create hall |
| PUT | /api/halls/:id | Admin | Update hall |
| DELETE | /api/halls/:id | Admin | Delete hall |
| POST | /api/halls/:id/images | Admin | Upload image (multipart) |
| DELETE | /api/halls/images/:img_id | Admin | Delete image |
| GET | /api/slots/:hall_id | — | Get slots (optional `?date=`) |
| POST | /api/slots | Admin | Create slot |
| DELETE | /api/slots/:id | Admin | Delete slot |
| GET | /api/bookings | User/Admin | Get bookings |
| GET | /api/bookings/hall/:hall_id | Admin | All bookings for a hall (calendar) |
| POST | /api/bookings | User | Create booking |
| PATCH | /api/bookings/:id/status | Admin | Confirm / Cancel |
| GET | /api/payments | Admin | All payment records |
| GET | /api/payments/:booking_id | User/Admin | Payments for a booking |
| POST | /api/payments | Admin | Record payment |

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router 6, Axios |
| Styling | Custom CSS — Playfair Display + DM Sans fonts |
| Backend | Node.js, Express.js |
| Auth | JWT + bcryptjs |
| Database | MySQL 8, mysql2 driver |
| File Upload | Multer (local storage in `backend/uploads/`) |
| Dev tooling | Nodemon, Concurrently |

---

## 🔒 Security Notes

- Passwords are hashed with bcrypt (cost factor 10)
- All protected routes require a valid JWT in the `Authorization` header
- Admin-only routes are guarded by role-based middleware
- Bookings use MySQL transactions to prevent race-condition double bookings
- `.env` and `uploads/` are gitignored — never committed

---

## 📁 .gitignore

Make sure your root `.gitignore` includes:

```
node_modules/
backend/uploads/
backend/.env
.env
```