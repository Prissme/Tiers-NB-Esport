# HOTFIX OOM Koyeb — Next.js 14 + Bot Discord

## Pourquoi l’OOM (exit code 9) arrivait
- **Build au runtime** : l’app Next.js était lancée sans `next build`, ce qui déclenchait une compilation en production.
- **Bot Discord gourmand au démarrage** : la synchronisation des tiers chargeait 150+ joueurs d’un coup.
- **Boucle infinie sur les tiers** : le système de tiers cassé relançait des traitements coûteux.
- **Serveur HTTP instable** : démarrage non séquencé, bot et web simultanés.
- **Option `experimental.appDir` obsolète** : source de confusion et de comportements inattendus.

## Correctifs appliqués
- **Build forcé** via `postinstall` + `NODE_ENV=production`.
- **Serveur custom stabilisé** (`server.js`) qui :
  - charge le `.env`,
  - valide les variables critiques,
  - démarre le bot **2 secondes après** le serveur,
  - **ne coupe jamais** le web si le bot échoue.
- **Système de tiers désactivé** :
  - retour immédiat dans `syncTiersWithRoles()`,
  - appels au démarrage et en intervalle **commentés**,
  - logs d’avertissement explicites.
- **Headers + optimisations mémoire** dans `next.config.js`.

## Comment réactiver les tiers plus tard
1. **Réparer la logique tiers** (éviter toute boucle infinie).
2. Dans `discord-bot/unified-bot.js` :
   - retirer le `return` en début de `syncTiersWithRoles()`,
   - décommenter l’appel au démarrage,
   - décommenter l’intervalle périodique.
3. Vérifier les rôles dans `.env` :
   - `ROLE_TIER_S` à `ROLE_TIER_E`.
4. Redéployer.

## Checklist de déploiement
- [ ] `.env` présent avec **SUPABASE_URL**, **SUPABASE_ANON_KEY**, **SUPABASE_SERVICE_ROLE_KEY**.
- [ ] `DISCORD_BOT_TOKEN` et `DISCORD_GUILD_ID` renseignés.
- [ ] `NODE_ENV=production`.
- [ ] `postinstall` exécute `next build`.
- [ ] `server.js` utilisé en `start`.
- [ ] Tiers confirmés comme **désactivés**.

## Logs attendus (exemples)
### Serveur
- `[Server] Variables critiques OK (web).`
- `[Server] Serveur Next.js prêt sur http://0.0.0.0:3000`

### Bot (désactivé / incomplet)
- `[Server] Démarrage du bot annulé : variables manquantes ou clé Supabase absente (SUPABASE_SERVICE_ROLE_KEY ou SUPABASE_KEY).`

### Bot (activé, mais tiers désactivés)
- `[UnifiedBot] Synchronisation des tiers désactivée : cette routine est mise en pause pour éviter les surcharges mémoire.`

## Résultat attendu
- Plus de compilation runtime.
- Démarrage web stable même si le bot échoue.
- Pic mémoire réduit au boot.
