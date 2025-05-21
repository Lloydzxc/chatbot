# Church Chatbot Web App

A simple web-based chatbot application for a church organization, designed to support user authentication, FAQ responses, and event bookings such as weddings, baptisms, and more.

---

## 📅 Project Date
**Created:** April 11, 2025

---

## 📁 Project Structure

```
.
├── server.js             # Express.js backend server
├── db.js                 # PostgreSQL database connection
├── script.js             # Frontend chatbot logic
├── index.html            # Chatbot interface (protected)
├── login.html            # Login form
├── register.html         # Registration form
├── homepage.html         # General homepage
├── style.css             # App styling (assumed from linked files)
└── /data/faqs.json       # (Referenced) contains FAQ keywords and answers
```

---

## 💡 Features

### 1. **Authentication**
- Users can **register** and **log in** securely using bcrypt-hashed passwords.
- Sessions are managed via `express-session`, and client-side login status is tracked using `localStorage`.
- Only logged-in users can access the **chat page** (`/chat`).

### 2. **Chatbot Functionality**
- Offers instant responses to frequently asked questions (FAQs) such as service times, donations, church location, etc.
- Supports interactive message input with enter key handling and message scrolling.
- Provides a dynamic list of FAQ quick-reply buttons.

### 3. **Event Booking System**
- Users can request bookings for events like:
  - Baptism
  - Wedding
  - Funeral Services
  - Baby Dedications
  - House Blessings
- A real-time **availability check** prevents double bookings.
- Duplicate booking attempts (same user, event, date, and time) are **detected and warned** through a chat message.
- Bookings are saved in a PostgreSQL database.

---

## 🔐 Routes Overview

| Method | Route                  | Description                         |
|--------|------------------------|-------------------------------------|
| GET    | `/`                    | Login page                          |
| GET    | `/register`            | User registration page              |
| POST   | `/login`               | Handles login and session setup     |
| POST   | `/register`            | Handles new user registration       |
| GET    | `/homepage`            | Protected homepage                  |
| GET    | `/chat`                | Protected chatbot interface         |
| POST   | `/api/book`            | Accepts event booking requests      |
| POST   | `/api/respond`         | Processes user messages via NLP     |
| GET    | `/api/unavailable-times` | Returns booked time slots for a date |
| GET    | `/logout`              | Ends the session                    |

---

## 🧠 Technologies Used

- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **Backend**: Node.js with Express
- **Database**: PostgreSQL
- **Session Management**: express-session
- **Password Security**: bcrypt
- **NLP**: `compromise` for keyword matching

---

## ⚙️ Setup Instructions

1. **Clone the Repository**:
   ```bash
   git clone https://your-repo-url.git
   cd your-project-directory
   ```

2. **Install Dependencies**:
   ```bash
   npm install express bcrypt express-session pg compromise
   ```

3. **Set Up PostgreSQL**:
   - Ensure PostgreSQL is running.
   - Create the `churchchatbot` database.
   - Run SQL to create required tables:
     ```sql
     CREATE TABLE users (
       id SERIAL PRIMARY KEY,
       username VARCHAR(100),
       email VARCHAR(100),
       password_hash TEXT
     );

     CREATE TABLE bookings (
       id SERIAL PRIMARY KEY,
       user_id INT REFERENCES users(id),
       name VARCHAR(100),
       email VARCHAR(100),
       event VARCHAR(100),
       date DATE,
       time TIME
     );
     ```

4. **Run the Server**:
   ```bash
   node server.js
   ```

5. **Visit**: [http://localhost:3000](http://localhost:3000)

---

## ✅ To Do

- [ ] Add admin panel to view/manage bookings
- [ ] Add email notifications for booking confirmations
- [ ] Expand chatbot NLP capabilities
- [ ] Implement mobile-responsive improvements

---

## 📝 License
This project is built for academic or ministry-related purposes. Please credit the original author when reusing or modifying.
