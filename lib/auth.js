const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      organizationId: user.organizationId,
      name: user.name
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

function getTokenFromReq(req) {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7) : null;
}

function publicUser(row) {
  if (!row) return null;

  return {
    id: row.id,
    role: row.role,
    organizationId: row.organization_id || row.organizationId,
    name: row.name,
    status: row.status,
    profile: row.profile || {},
    bloomScores: row.bloom_scores || row.bloomScores || { d3: 0, d7: 0, d21: 0 },
    bloomScore: row.bloom_score ?? row.bloomScore ?? 0,
    bloomLevel: row.bloom_level ?? row.bloomLevel ?? "Unknown",
    progressSymbol: row.progress_symbol ?? row.progressSymbol ?? "Sideways",
    createdAt: row.created_at || row.createdAt,
    updatedAt: row.updated_at || row.updatedAt
  };
}

module.exports = {
  hashPassword,
  comparePassword,
  signToken,
  verifyToken,
  getTokenFromReq,
  publicUser
};
