# 💒 Wedding Hall Booking Management System

Full-stack web app built with **React + Node.js/Express + MySQL**.

---

## Project Structure

```
wedding-hall/
├── backend/          # Node.js + Express API
│   ├── config/
│   │   ├── db.js         # MySQL connection pool
│   │   └── setup.sql     # Database schema + seed data
│   ├── middleware/
│   │   └── auth.js       # JWT auth + admin guard
│   ├── routes/
│   │   ├── auth.js       # Register / Login
│   │   ├── halls.js      # Hall CRUD + images
│   │   ├── slots.js      # Time slot management
│   │   ├── bookings.js   # Booking with transaction safety
│   │   └── payments.js   # Payment tracking
│   ├── .env.example
│   └── server.js
└── frontend/         # React app
    └── src/
        ├── pages/
        │   ├── Home.js
        │   ├── Login.js / Register.js
        │   ├── Halls.js          # Browse halls
        │   ├── HallDetail.js     # Slot picker + booking
        │   ├── MyBookings.js     # User booking history
        │   └── AdminDashboard.js # Full admin panel
        ├── context/AuthContext.js
        ├── api.js
        └── index.css
```

---

## Setup Instructions

### 1. MySQL Database

Make sure MySQL is running, then:

```bash
mysql -u root -p < backend/config/setup.sql
```

This creates the `wedding_hall_db` database, all tables, and seeds:
- 3 sample halls
- Sample time slots for the next few days
- Admin user: `admin@weddinghall.com` / `admin123`

---

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your MySQL password and a JWT secret
npm install
npm run dev        # runs on http://localhost:5000
```

**Edit `.env`:**
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=wedding_hall_db
JWT_SECRET=any_long_random_string
PORT=5000
```

---

### 3. Frontend

```bash
cd frontend
npm install
npm start          # runs on http://localhost:3000
```

The React app proxies API calls to `localhost:5000` automatically.

---

## Features

### User
- Register / Login with JWT auth
- Browse active wedding halls
- Search halls by name or location
- View hall details, images, capacity, pricing
- Pick a date → see available time slots
- Book a slot (prevents double booking via DB transaction)
- View booking history + payment status

### Admin (`admin@weddinghall.com` / `admin123`)
- Dashboard with stats (halls, bookings, pending, confirmed)
- **Halls tab:** Add / Edit / Delete halls, add image URLs
- **Bookings tab:** View all bookings, filter by status, confirm/cancel, record payments
- **Slots tab:** Add / delete time slots per hall per date
- **Payments tab:** View all payment records + total revenue

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/register | — | Register user |
| POST | /api/auth/login | — | Login |
| GET | /api/halls | — | List active halls |
| GET | /api/halls/all | Admin | List all halls |
| POST | /api/halls | Admin | Create hall |
| PUT | /api/halls/:id | Admin | Update hall |
| DELETE | /api/halls/:id | Admin | Delete hall |
| GET | /api/slots/:hall_id | — | Get slots (optional ?date=) |
| POST | /api/slots | Admin | Create slot |
| DELETE | /api/slots/:id | Admin | Delete slot |
| GET | /api/bookings | User/Admin | Get bookings |
| POST | /api/bookings | User | Create booking |
| PATCH | /api/bookings/:id/status | Admin | Update status |
| GET | /api/payments | Admin | All payments |
| POST | /api/payments | Admin | Record payment |

---

## Tech Stack

- **Frontend:** React 18, React Router 6, Axios, CSS
- **Backend:** Node.js, Express.js, bcryptjs, jsonwebtoken
- **Database:** MySQL 8 with mysql2 driver
- **Security:** bcrypt password hashing, JWT auth, role-based access, transaction-safe bookings
