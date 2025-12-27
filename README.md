# LFN League Hub

Site officiel de la LFN : clair, strict, orienté conversion et prêt pour une montée en charge.

## Démarrage local

```bash
npm install
npm run dev
```

Le script `dev` lance Next.js **et** le bot Discord. Si vous ne souhaitez lancer que le site :

```bash
NODE_ENV=development npx next dev
```

Accédez à `http://localhost:3000`.

## Données de la ligue

Toutes les données sont dans `data/lfn.data.json`.

Structure minimale :

```json
{
  "season": { "name": "LFN Saison 2", "status": "", "dates": { "start": "", "end": "" } },
  "links": { "discord": "", "challonge": "", "rules": "" },
  "announcements": [],
  "teams": [],
  "matches": [],
  "standings": []
}
```

### Remplir les champs

- `season.status` : `inscriptions_ouvertes`, `en_cours`, `terminee` ou vide (affiché comme "à annoncer").
- `links.discord`, `links.rules`, `links.challonge` : URL officielles si disponibles.
- `announcements` : annonces publiques (titre, date, contenu).
- `teams` : équipes validées (pas de données fictives).
- `matches` : calendrier et résultats. Utilisez `status: "played"` pour publier un score.
- `standings` : standings officiels par division.

## Espace admin

1. Définissez `ADMIN_PASSWORD` dans votre environnement (ou `.env`).
2. Ouvrez `/admin`.
3. Modifiez les données et sauvegardez.

> En environnement serverless, l'écriture sur disque peut échouer. Dans ce cas, la sauvegarde reste en mémoire pour la session et vous pouvez basculer vers une solution persistante (KV, Supabase, ou un volume Koyeb).

## Déploiement Koyeb

1. **Build command** : `npm run build`
2. **Run command** : `npm run start`
3. **Environment variables** :
   - `NODE_ENV=production`
   - `ADMIN_PASSWORD=...`
   - Variables du bot Discord si vous le conservez.

Koyeb supporte le déploiement Next.js via `next build` + `next start` (ou votre `server.js` existant). Si vous utilisez un volume pour la persistance, montez-le sur `data/`.
