const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, organizationId: user.organizationId, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function authRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    const payload = verifyToken(token);
    req.auth = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

function roleRequired(...roles) {
  return (req, res, next) => {
    if (!req.auth) return res.status(401).json({ error: "Unauthorized" });
    if (!roles.includes(req.auth.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}

module.exports = {
  signToken,
  verifyToken,
  hashPassword,
  comparePassword,
  authRequired,
  roleRequired
};
