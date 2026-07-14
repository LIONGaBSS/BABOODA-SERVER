const { sql } = require("@vercel/postgres");

async function getActiveUserCount(role) {
  const result = await sql`
    select count(*)::int as count
    from users
    where role = ${role} and status = 'active'
  `;
  return result.rows[0]?.count || 0;
}

async function isWhitelisted(role, organizationId) {
  const result = await sql`
    select 1
    from whitelist
    where role = ${role} and organization_id = ${organizationId}
    limit 1
  `;
  return result.rowCount > 0;
}

async function getUserByRoleAndOrg(role, organizationId) {
  const result = await sql`
    select *
    from users
    where role = ${role}
      and organization_id = ${organizationId}
      and status = 'active'
    limit 1
  `;
  return result.rows[0] || null;
}

async function getUserById(id) {
  const result = await sql`
    select *
    from users
    where id = ${id}
    limit 1
  `;
  return result.rows[0] || null;
}

async function createUser({
  id,
  role,
  organizationId,
  passwordHash,
  name,
  profile
}) {
  const result = await sql`
    insert into users (
      id, role, organization_id, password_hash, name, status,
      profile, bloom_scores, bloom_score, bloom_level, progress_symbol,
      created_at, updated_at
    )
    values (
      ${id}, ${role}, ${organizationId}, ${passwordHash}, ${name}, 'active',
      ${JSON.stringify(profile)}::jsonb,
      ${JSON.stringify({ d3: 0, d7: 0, d21: 0 })}::jsonb,
      0, 'Unknown', 'Sideways',
      now(), now()
    )
    returning *
  `;
  return result.rows[0];
}

async function updateUserProfile(id, name, profilePatch) {
  const current = await getUserById(id);
  if (!current) return null;

  const mergedProfile = {
    ...(current.profile || {}),
    ...(profilePatch || {})
  };

  const result = await sql`
    update users
    set
      name = ${name ?? current.name},
      profile = ${JSON.stringify(mergedProfile)}::jsonb,
      updated_at = now()
    where id = ${id}
    returning *
  `;
  return result.rows[0] || null;
}

module.exports = {
  getActiveUserCount,
  isWhitelisted,
  getUserByRoleAndOrg,
  getUserById,
  createUser,
  updateUserProfile
};
