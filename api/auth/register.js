const { handleOptions, setCors } = require("../../lib/http");
const { hashPassword, signToken, publicUser } = require("../../lib/auth");
const {
  getActiveUserCount,
  isWhitelisted,
  getUserByRoleAndOrg,
  createUser
} = require("../../lib/db");

module.exports = async (req, res) => {
  setCors(res);
  if (handleOptions(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      role,
      organizationId,
      password,
      name,
      age = "",
      classNo = "",
      subject = "",
      designation = "",
      discipline = "",
      school = "",
      department = "",
      address = "",
      phone = "",
      email = "",
      extra1 = "",
      extra2 = "",
      extra3 = "",
      extra4 = "",
      extra5 = "",
      extra6 = "",
      extra7 = "",
      extra8 = "",
      extra9 = ""
    } = req.body || {};

    if (!role || !organizationId || !password || !name) {
      return res.status(400).json({
        error: "role, organizationId, password, and name are required"
      });
    }

    if (!["organizer", "admin", "user"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    const limits = {
      organizer: 5,
      admin: 50,
      user: 1000
    };

    const activeCount = await getActiveUserCount(role);
    if (activeCount >= limits[role]) {
      return res.status(400).json({
        error: `Maximum ${limits[role]} ${role}s allowed`
      });
    }

    const approved = await isWhitelisted(role, organizationId);
    if (!approved) {
      return res.status(403).json({
        error: "This organization ID is not approved for this role"
      });
    }

    const existing = await getUserByRoleAndOrg(role, organizationId);
    if (existing) {
      return res.status(409).json({ error: "This ID is already registered" });
    }

    const passwordHash = await hashPassword(password);
    const userId = `${role}_${Date.now()}`;

    const profile = {
      age,
      classNo,
      subject,
      designation,
      discipline,
      school,
      department,
      address,
      phone,
      email,
      extra1,
      extra2,
      extra3,
      extra4,
      extra5,
      extra6,
      extra7,
      extra8,
      extra9
    };

    const user = await createUser({
      id: userId,
      role,
      organizationId,
      passwordHash,
      name,
      profile
    });

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
