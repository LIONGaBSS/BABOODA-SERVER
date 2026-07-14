const { handleOptions, setCors } = require("../../lib/http");
const { verifyToken, getTokenFromReq, publicUser } = require("../../lib/auth");
const { getUserById, updateUserProfile } = require("../../lib/db");

module.exports = async (req, res) => {
  setCors(res);
  if (handleOptions(req, res)) return;

  const token = getTokenFromReq(req);
  if (!token) {
    return res.status(401).json({ error: "Missing token" });
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  try {
    const user = await getUserById(payload.sub);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (req.method === "GET") {
      return res.status(200).json({ user: publicUser(user) });
    }

    if (req.method === "PUT") {
      const body = req.body || {};
      const updated = await updateUserProfile(
        user.id,
        body.name,
        {
          age: body.age,
          classNo: body.classNo,
          subject: body.subject,
          designation: body.designation,
          discipline: body.discipline,
          school: body.school,
          department: body.department,
          address: body.address,
          phone: body.phone,
          email: body.email,
          extra1: body.extra1,
          extra2: body.extra2,
          extra3: body.extra3,
          extra4: body.extra4,
          extra5: body.extra5,
          extra6: body.extra6,
          extra7: body.extra7,
          extra8: body.extra8,
          extra9: body.extra9
        }
      );

      return res.status(200).json({ user: publicUser(updated) });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
