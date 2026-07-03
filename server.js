// server.js
const express = require("express");
const session = require("express-session");
const path = require("path");

const store = require("./lib/store");
const { requireAuth, requireAdmin } = require("./middleware/auth");

store.seedIfEmpty();

const app = express();
const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: "synoxhub-" + (process.env.SESSION_SECRET || "ganti-secret-ini"),
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 } // 7 days
  })
);

// Make site settings available to every view without repeating ourselves.
app.use((req, res, next) => {
  res.locals.settings = store.getSettings();
  res.locals.path = req.path;
  next();
});

// ---------- Public routes ----------
app.use("/", require("./routes/auth"));

app.get("/", (req, res) => {
  res.redirect(req.session.userId ? "/dashboard" : "/login");
});

// ---------- Authenticated routes ----------
app.use(requireAuth);

app.get("/dashboard", (req, res) => {
  const usage = store.canUseFeature(req.currentUser.id);
  res.render("dashboard", { usage });
});

app.use("/", require("./routes/ai"));
app.use("/", require("./routes/downloader"));
app.use("/", require("./routes/stalker"));

// ---------- Admin-only ----------
app.use("/admin", requireAdmin);
app.use("/", require("./routes/admin"));

// ---------- Errors ----------
app.use((req, res) => {
  res.status(404).render("error", {
    title: "Halaman tidak ditemukan",
    message: "URL yang kamu tuju tidak tersedia.",
    currentUser: req.currentUser || null
  });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render("error", {
    title: "Terjadi kesalahan",
    message: err.message || "Ada yang salah di server.",
    currentUser: req.currentUser || null
  });
});

app.listen(PORT, () => {
  console.log(`SynoxHub berjalan di http://localhost:${PORT}`);
  console.log(`Login default -> username: admin | password: admin123 (segera ganti!)`);
});
