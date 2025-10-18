const { createClient } = require('@supabase/supabase-js');
const { validateAdminToken } = require('./_shared/admin');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE ||
  process.env.SUPABASE_KEY;

const jsonHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*'
};

exports.handler = async (event) => {
  try {
    // Vérification du token admin
    const authCheck = validateAdminToken(event?.headers || {});
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    // Vérification de la méthode HTTP
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers: jsonHeaders,
        body: JSON.stringify({ ok: false, error: 'Méthode non autorisée.' })
      };
    }

    // Vérification de la configuration Supabase
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Config manquante:', {
        hasUrl: !!SUPABASE_URL,
        hasKey: !!SUPABASE_SERVICE_ROLE_KEY
      });
      return {
        statusCode: 500,
        headers: jsonHeaders,
        body: JSON.stringify({ ok: false, error: 'Configuration Supabase manquante.' })
      };
    }

    // Récupération et validation de l'email
    const body = JSON.parse(event.body || '{}');
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!email) {
      return {
        statusCode: 400,
        headers: jsonHeaders,
        body: JSON.stringify({ ok: false, error: 'Email requis.' })
      };
    }

    // Validation format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        statusCode: 400,
        headers: jsonHeaders,
        body: JSON.stringify({ ok: false, error: 'Format d\'email invalide.' })
      };
    }

    // Création du client Supabase avec la clé service_role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Récupération de tous les utilisateurs et recherche par email
    const { data, error } = await supabase.auth.admin.listUsers();

    if (error) {
      console.error('Erreur listUsers:', error);
      throw error;
    }

    if (!data || !data.users) {
      console.error('Aucune donnée utilisateur retournée');
      return {
        statusCode: 500,
        headers: jsonHeaders,
        body: JSON.stringify({ ok: false, error: 'Erreur lors de la récupération des utilisateurs.' })
      };
    }

    // Recherche de l'utilisateur par email (insensible à la casse)
    const user = data.users.find(u => 
      u.email && u.email.toLowerCase() === email
    );

    if (!user) {
      return {
        statusCode: 404,
        headers: jsonHeaders,
        body: JSON.stringify({ 
          ok: false, 
          error: `Aucun compte Supabase trouvé pour l'email "${email}". L'utilisateur doit d'abord s'inscrire.`
        })
      };
    }

    // Retour des informations de l'utilisateur
    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify({
        ok: true,
        user: {
          id: user.id,
          email: user.email,
          created_at: user.created_at,
          email_confirmed_at: user.email_confirmed_at,
          last_sign_in_at: user.last_sign_in_at
        }
      })
    };
  } catch (err) {
    console.error('Erreur getUserByEmail:', err);
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({ 
        ok: false, 
        error: err.message || 'Erreur interne du serveur.'
      })
    };
  }
};
