const { handleOptions, setCors } = require("../../lib/http");
const { comparePassword, signToken, publicUser } = require("../../lib/auth");
const { getUserByRoleAndOrg } = require("../../lib/db");

module.exports = async (req, res) => {
  setCors(res);
  if (handleOptions(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { role, organizationId, password } = req.body || {};

    if (!role || !organizationId || !password) {
      return res.status(400).json({
        error: "role, organizationId, and password are required"
      });
    }

    const user = await getUserByRoleAndOrg(role, organizationId);
    if (!user) {
      return res.status(401).json({ error: "Invalid login" });
    }

    const ok = await comparePassword(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: "Invalid login" });
    }

    const token = signToken({
      id: user.id,
      role: user.role,
      organizationId: user.organization_id,
      name: user.name
    });

    return res.status(200).json({
      token,
      user: publicUser(user)
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
