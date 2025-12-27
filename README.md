# LFN — Saison 2

Site officiel LFN : inscriptions, règlement, calendrier, résultats et standings. Interface 100% data-driven.

## Démarrage local

```bash
npm install
npm run dev
```

Le script `dev` lance Next.js **et** le bot Discord. Si vous souhaitez lancer uniquement le site :

```bash
NODE_ENV=development npx next dev
```

Accédez à `http://localhost:3000`.

## Données de la ligue

Source unique : `data/lfn.data.json`.

Structure attendue :

```json
{
  "season": {
    "name": "LFN Saison 2",
    "status": "inscriptions",
    "deadline": "2025-12-29T15:00:00+01:00",
    "timezone": "Europe/Brussels"
  },
  "links": { "discord": "https://discord.gg/q6sFPWCKD7" },
  "format": {
    "d1": { "teams": 4, "bo": 5, "fearlessDraft": true, "matchesPerDay": 2 },
    "d2": { "teams": 6, "bo": 3, "matchesPerDay": 3 },
    "times": ["19:00", "20:00", "21:00"]
  },
  "rules": {
    "tiebreak": "winrate",
    "roster": { "starters": 3, "subsRequired": 3, "coachOptional": true },
    "lateness": { "15min": "lose_1_set", "20min": "autolose" }
  },
  "announcements": [],
  "teams": [],
  "matches": [],
  "results": [],
  "standings": []
}
```

### Remplir les champs

- `season.status` : `inscriptions`, `en_cours`, `terminee` ou vide.
- `season.deadline` : ISO 8601 avec fuseau (ex: `2025-12-29T15:00:00+01:00`).
- `format` / `rules` : données officielles LFN (ne pas inventer).
- `announcements` : annonces publiées (titre, date, contenu).
- `teams` : équipes validées.
- `matches` : calendrier officiel (id, date, time, division, teams, bo).
- `results` : scores validés (matchId, scoreA, scoreB, reportedAt).
- `standings` : standings par division.

## Espace admin

1. Définissez `ADMIN_PASSWORD` dans votre environnement (ou `.env`).
2. Ouvrez `/admin`.
3. Modifiez les données et sauvegardez.

> En environnement serverless, l'écriture sur disque peut échouer. Dans ce cas, la sauvegarde reste en mémoire pour la session. Pour la persistance, montez un volume (Koyeb) ou utilisez une base (KV / Supabase).

## Déploiement Koyeb

1. **Build command** : `npm run build`
2. **Run command** : `npm run start`
3. **Environment variables** :
   - `NODE_ENV=production`
   - `ADMIN_PASSWORD=...`
   - Variables du bot Discord si vous le conservez

Koyeb supporte le déploiement Next.js via `next build` + `next start` (ou votre `server.js`). Si vous utilisez un volume pour la persistance, montez-le sur `data/`.
