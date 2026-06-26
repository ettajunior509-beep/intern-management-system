-- ============================================================
--  INTERN MANAGEMENT SYSTEM – DATABASE SCHEMA
-- ============================================================

CREATE DATABASE IF NOT EXISTS intern_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE intern_management;

-- ── Admins ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admins (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  full_name       VARCHAR(255) NOT NULL,
  email           VARCHAR(255) UNIQUE NOT NULL,
  phone           VARCHAR(50),
  position        VARCHAR(100) DEFAULT 'Administrator',
  password        VARCHAR(255) NOT NULL,
  profile_picture VARCHAR(255) DEFAULT NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── Interns ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS interns (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  full_name         VARCHAR(255) NOT NULL,
  email             VARCHAR(255) UNIQUE NOT NULL,
  phone             VARCHAR(50),
  school            VARCHAR(255),
  department        VARCHAR(255),
  internship_start  DATE,
  internship_end    DATE,
  password          VARCHAR(255) NOT NULL,
  profile_picture   VARCHAR(255) DEFAULT NULL,
  status            ENUM('pending','approved','rejected') DEFAULT 'pending',
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── Tasks ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  title           VARCHAR(255) NOT NULL,
  description     TEXT,
  intern_id       INT NOT NULL,
  assigned_by     INT NOT NULL,
  deadline        DATE,
  priority        ENUM('low','medium','high') DEFAULT 'medium',
  status          ENUM('pending','submitted','approved','rejected') DEFAULT 'pending',
  submission_text TEXT,
  admin_feedback  TEXT,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  submitted_at    TIMESTAMP NULL DEFAULT NULL,
  reviewed_at     TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (intern_id)   REFERENCES interns(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES admins(id)  ON DELETE CASCADE
);

-- ── Attendance ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  intern_id     INT NOT NULL,
  date          DATE NOT NULL,
  check_in_time TIME,
  status        ENUM('present','absent','late') DEFAULT 'present',
  notes         VARCHAR(255),
  UNIQUE KEY uq_intern_date (intern_id, date),
  FOREIGN KEY (intern_id) REFERENCES interns(id) ON DELETE CASCADE
);

-- ── Notifications ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  intern_id  INT,
  title      VARCHAR(255) NOT NULL,
  message    TEXT NOT NULL,
  type       ENUM('info','success','warning','danger') DEFAULT 'info',
  is_read    BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (intern_id) REFERENCES interns(id) ON DELETE CASCADE
);

-- ── Evaluations ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS evaluations (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  intern_id          INT NOT NULL,
  admin_id           INT NOT NULL,
  grade              DECIMAL(5,2),
  performance_rating ENUM('Excellent','Good','Average','Poor') DEFAULT 'Good',
  comments           TEXT,
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (intern_id) REFERENCES interns(id) ON DELETE CASCADE,
  FOREIGN KEY (admin_id)  REFERENCES admins(id)  ON DELETE CASCADE
);

-- ── Calendar Events ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS calendar_events (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(255) NOT NULL,
  description TEXT,
  event_date  DATE NOT NULL,
  event_type  ENUM('internship_start','internship_end','task_deadline','meeting','other') DEFAULT 'other',
  intern_id   INT NULL,
  created_by  INT NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (intern_id)  REFERENCES interns(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES admins(id)  ON DELETE CASCADE
);
