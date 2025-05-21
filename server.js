const express = require("express");
const path = require("path");
const bcrypt = require("bcrypt");
const session = require("express-session"); // <-- For session management
const db = require("./db");
const faqs = require("./data/faqs.json");
const nlp = require('compromise');


const app = express();
const PORT = 3000;

// 🧠 Session middleware
app.use(session({
  secret: 'mySecretKey123',
  resave: false,
  saveUninitialized: false
}));

// 🛠 Middleware for parsing and serving
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// 📄 Public routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "login.html"));
});

app.get("/register", (req, res) => {
  res.sendFile(path.join(__dirname, "register.html"));
});

// 🔐 Protected routes
app.get("/homepage", (req, res) => {
  if (!req.session.user) return res.redirect("/");
  res.sendFile(path.join(__dirname, "homepage.html"));
});

app.get("/chat", (req, res) => {
  if (!req.session.user) return res.redirect("/");
  res.sendFile(path.join(__dirname, "protected/index.html"));
});

// ✅ User registration
app.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const userExists = await db.query(
      "SELECT * FROM users WHERE username = $1 OR email = $2",
      [username, email]
    );

    if (userExists.rows.length > 0) {
      return res.redirect("/register?error=exists");
    }

    const password_hash = await bcrypt.hash(password, 10);
    await db.query(
      "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3)",
      [username, email, password_hash]
    );

    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.status(500).send("Registration error");
  }
});

// ✅ Login and session setup
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await db.query("SELECT * FROM users WHERE username = $1", [username]);

    if (result.rows.length === 0) {
      return res.redirect("/?error=invalid");
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);

    if (match) {
      req.session.user = { id: user.id, username: user.username };
      return res.send(`
        <script>
          localStorage.setItem('userLoggedIn', 'true'); // ✅ Set login state in localStorage
          window.location.href = '/chat'; // Redirect to the chat page
        </script>
      `);
    } else {
      return res.redirect("/?error=invalid");
    }

  } catch (err) {
    console.error("❌ Login error:", err.stack);
    res.status(500).send("Login error");
  }
});

// ✅ User registration
app.post("/register", async (req, res) => {
  // ...registration logic
});

// ✅ Login route — insert here!
app.post("/login", async (req, res) => {
  // ...corrected login logic
});


// 🤖 Chatbot FAQ response API
app.post("/api/respond", (req, res) => {
  const userMessage = req.body.message.toLowerCase();
  const doc = nlp(userMessage);
  const terms = doc.terms().out('array').map(word => word.toLowerCase());

  let bestMatch = null;
  let highestScore = 0;

  for (const faq of faqs) {
    let score = 0;
    for (const keyword of faq.keywords) {
      // ✅ Pro Tip applied here
      if (
        userMessage.includes(keyword.toLowerCase()) || 
        terms.includes(keyword.toLowerCase())
      ) {
        score++;
      }
    }
  
    if (score > highestScore) {
      highestScore = score;
      bestMatch = faq;
    }
  }
  

  let reply;

  if (bestMatch) {
    if (bestMatch.answer.startsWith("📅 Redirect to booking::")) {
      const parts = bestMatch.answer.split("::");
      const eventType = parts[1] || "event";
      reply = `__CONFIRM_BOOKING__::${eventType}`;
  } else {
    reply = bestMatch.answer;
  }
} else {
  reply = "🤖 We do not understand it yet. Please try rephrasing or contact the church office.";
}


  res.json({ reply });
});

app.post("/api/check-user", async (req, res) => {
  const { name, email } = req.body;

  try {
    const result = await db.query(
      "SELECT * FROM users WHERE username = $1 AND email = $2",
      [name, email]
    );

    if (result.rows.length > 0) {
      return res.json({ exists: true }); // user exists
    } else {
      return res.json({ exists: false }); // user does not exist
    }
  } catch (err) {
    console.error("Error checking user:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});


// 📅 Booking endpoint – uses session to get user details
app.post("/api/book", async (req, res) => {
  const { event, date, time } = req.body;
  const userId = req.session.user ? req.session.user.id : null;

  console.log("📥 Booking attempt:", { userId, event, date, time }); // Log the booking data

  if (!userId) {
    console.warn("⛔ Booking blocked — user not logged in.");
    return res.status(403).json({ message: "❌ You must be logged in to book." });
  }

  try {
    // Check if the user has already booked the same event at the same time
    const existingBooking = await db.query(
      "SELECT * FROM bookings WHERE user_id = $1 AND event = $2 AND date = $3 AND time = $4",
      [userId, event, date, time]
    );

    if (existingBooking.rows.length > 0) {
      // If booking already exists, send a message to the frontend (chatbot)
      return res.json({
        message: `❌ You have already booked the ${event} on ${date} at ${time}. Please choose another time or event.`,
        duplicate: true // Mark as a duplicate booking
      });
    }

    // Insert booking into database if no duplicate
    const userResult = await db.query("SELECT username, email FROM users WHERE id = $1", [userId]);
    console.log("👤 Booking for user:", userResult.rows[0]);

    const insertResult = await db.query(
      "INSERT INTO bookings (user_id, name, email, event, date, time) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [userId, userResult.rows[0].username, userResult.rows[0].email, event, date, time]
    );

    console.log("✅ Booking inserted:", insertResult.rows[0]); // Log inserted booking

    res.json({ message: `✅ Booking confirmed for ${event} on ${date} at ${time}!` });
  } catch (err) {
    console.error("❌ Booking error:", err.stack);  // Log detailed error
    res.status(500).json({ message: "❌ Failed to book. Please try again later." });
  }
});



// 🆕 Endpoint to return unavailable time slots for a specific date
app.get("/api/unavailable-times", async (req, res) => {
  const { date } = req.query;
  console.log("Fetching unavailable times for date:", date); // Log incoming request
  try {
    const result = await db.query("SELECT time FROM bookings WHERE date = $1", [date]);
    const times = result.rows.map(row => row.time);
    res.json({ unavailableTimes: times });
  } catch (err) {
    console.error("Failed to fetch unavailable times:", err); // Log database error
    res.status(500).json({ unavailableTimes: [] });
  }
});


// 🚪 Logout
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});


// 🟢 Start server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}/homepage.html`);
});