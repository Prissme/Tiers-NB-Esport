# Login Discord (bouton « S'inscrire »)

## Fonctionnement
1. `/auth/login` → redirige vers Discord (OAuth via Supabase Auth, scope `identify`).
2. `/auth/callback` → échange le code, puis :
   - si un joueur existe avec `players.discord_id = <ID Discord>` → il est **associé** (rien n'est créé) ;
   - sinon → création du joueur : `active = true`, **1 point, Tier E** (saison active), pays **non spécifié** (`country_code = 'ZZ'`).
3. `/auth/logout` (POST) → déconnexion.

Le header affiche l'avatar + pseudo Discord quand on est connecté.

## À configurer (une seule fois)
1. **Discord Developer Portal** → New Application → OAuth2 :
   - noter `Client ID` et `Client Secret` ;
   - Redirects : `https://<ton-projet>.supabase.co/auth/v1/callback`.
2. **Supabase** → Authentication → Providers → Discord : activer, coller Client ID / Secret.
3. **Supabase** → Authentication → URL Configuration :
   - Site URL : `https://<ton-domaine>` ;
   - Redirect URLs : `https://<ton-domaine>/auth/callback` (+ `http://localhost:3000/auth/callback` en dev).
4. **Koyeb** (variables d'env) : `NEXT_PUBLIC_SITE_URL=https://<ton-domaine>` (évite les mauvaises URL derrière le proxy),
   `SUPABASE_SERVICE_ROLE_KEY` (déjà utilisée par l'API), `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   (le middleware lit ces deux-là, pas `SUPABASE_URL`).

## Pays « non spécifié »
Code `ZZ` (ISO : inconnu). Respecte le check `char_length(country_code) = 2` : aucune migration.
Affiché 🌐 sur le site et dans le bot, exclu des classements par pays et des rôles pays.
