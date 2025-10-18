const ADMIN_SHARED_SECRET = process.env.ADMIN_SHARED_SECRET;

function getHeaderValue(headers, name) {
  if (!headers) return undefined;
  const entries = Object.entries(headers);
  const target = name.toLowerCase();
  for (const [key, value] of entries) {
    if (typeof key === 'string' && key.toLowerCase() === target) {
      return Array.isArray(value) ? value[0] : value;
    }
  }
  return undefined;
}

function validateAdminToken(headers) {
  if (!ADMIN_SHARED_SECRET) {
    console.error('ADMIN_SHARED_SECRET is not configured.');
    return {
      authorized: false,
      response: {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ ok: false, error: 'Admin configuration manquante.' })
      }
    };
  }

  const provided = getHeaderValue(headers, 'x-admin-token');
  if (!provided || provided !== ADMIN_SHARED_SECRET) {
    return {
      authorized: false,
      response: {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ ok: false, error: 'Accès administrateur refusé.' })
      }
    };
  }

  return { authorized: true };
}

module.exports = {
  validateAdminToken
};
