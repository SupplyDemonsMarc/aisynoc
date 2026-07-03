// middleware/auth.js
const store = require("../lib/store");

function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.redirect("/login");
  }
  const user = store.findUserById(req.session.userId);
  if (!user) {
    req.session.destroy(() => {});
    return res.redirect("/login");
  }
  req.currentUser = user;
  res.locals.currentUser = user;
  next();
}

function requireAdmin(req, res, next) {
  if (!req.currentUser || req.currentUser.role !== "admin") {
    return res.status(403).render("error", {
      title: "Akses ditolak",
      message: "Halaman ini khusus admin.",
      currentUser: req.currentUser || null,
      settings: res.locals.settings || store.getSettings()
    });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
