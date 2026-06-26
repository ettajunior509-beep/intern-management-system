# 🎓 InternMS – Intern Management System

A full-stack Intern Management System built with **Node.js + Express** (backend) and **Vanilla HTML/CSS/JS** (frontend), using **MySQL** as the database.

---

## 🚀 Quick Start

### 1. Setup the Database

1. Open **phpMyAdmin** or your MySQL client
2. Run the schema file:
   ```
   backend/config/schema.sql
   ```
   This creates the `intern_management` database and all tables.

### 2. Configure Environment

Edit `backend/.env` to match your MySQL credentials:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password_here
DB_NAME=intern_management
JWT_SECRET=intern_mgmt_super_secret_key_2026
PORT=5000
```

### 3. Install Backend Dependencies

```bash
cd backend
npm install
```

### 4. Start the Server

```bash
# Development (with auto-restart)
npm run dev

# Or production
npm start
```

### 5. Open the App

Visit: **http://localhost:5000**

---

## 📁 Project Structure

```
INTERN MANAGEMENT SYSTEM/
├── backend/
│   ├── config/
│   │   ├── db.js           # MySQL connection pool
│   │   └── schema.sql      # Database schema
│   ├── middleware/
│   │   └── auth.js         # JWT authentication
│   ├── routes/
│   │   ├── auth.js         # Login & registration
│   │   ├── interns.js      # Intern CRUD + approval
│   │   ├── tasks.js        # Task management
│   │   ├── attendance.js   # Check-in tracking
│   │   ├── calendar.js     # Events
│   │   ├── notifications.js
│   │   ├── evaluations.js  # Grading
│   │   └── reports.js      # Analytics
│   ├── .env
│   ├── package.json
│   └── server.js           # Main Express app
│
└── frontend/
    ├── css/
    │   ├── style.css       # Global design system
    │   └── auth.css        # Auth pages
    ├── js/
    │   └── app.js          # Shared utilities
    ├── admin/
    │   ├── dashboard.html
    │   ├── interns.html
    │   ├── tasks.html
    │   ├── attendance.html
    │   ├── calendar.html
    │   ├── reports.html
    │   ├── evaluations.html
    │   └── profile.html
    ├── intern/
    │   ├── dashboard.html
    │   ├── tasks.html
    │   ├── attendance.html
    │   ├── calendar.html
    │   └── profile.html
    ├── uploads/            # Profile pictures
    ├── index.html          # Landing page
    ├── login.html          # Login (admin/intern)
    └── register.html       # Registration
```

---

## 🔑 Features

### Authentication
- Admin register/login (instant access)
- Intern register (requires admin approval before login)
- JWT tokens, bcrypt password hashing
- Role-based access control

### Admin Features
- Dashboard with live stats and charts
- Approve/reject intern registrations
- Add, edit, delete interns
- Assign tasks with priority & deadlines
- Review submitted tasks (approve/reject with feedback)
- Monitor attendance records
- Interactive calendar with event management
- Generate reports & analytics
- Evaluate and grade interns
- Admin profile management

### Intern Features
- Dashboard with progress, tasks, check-in
- Daily attendance check-in with automatic time stamp
- View and submit assigned tasks
- View evaluation/grade
- Interactive calendar (events + attendance overlay)
- Notification system
- Profile management

---

## 🛠 Tech Stack

| Layer     | Technology          |
|-----------|---------------------|
| Frontend  | HTML5, CSS3, Vanilla JS |
| Backend   | Node.js + Express   |
| Database  | MySQL               |
| Auth      | JWT + bcryptjs      |
| Charts    | Chart.js (CDN)      |
| Fonts     | Google Fonts (Inter)|

---

## ⚙️ Default Admin Registration

Go to `http://localhost:5000/register.html` → select **Admin** tab → register your first admin account.
