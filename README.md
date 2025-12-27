# LFN League Site

Minimal, dark-mode esports league website built with **Next.js** and
**Tailwind CSS**. Pages include home, rulebook, schedule, standings, and teams.

## Getting Started

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` to view the site.

## Editing League Data

All league data lives in `data/lfn.json`.

### Structure

- `meta`: season metadata (`seasonName`, `year`, `lastUpdatedISO`,
  `signatureLine`, `discordInviteUrl`).
- `teams`: Team list with `id`, `name`, `tag`, optional `logoUrl`, and
  `roster` (`captain`, `players`, `subs`).
- `schedule`: Array of days with `dayLabel`, optional `date`, and `matches`
  entries (`id`, `time`, `teamAId`, `teamBId`, optional `extraLine`).
- `results`: Match results with `matchId`, `scoreA`, `scoreB`,
  `reportedAtISO`.

### Common Updates

- **Update the schedule**: edit `schedule` days or add matches. Keep match
  `id` values unique so results can map correctly.
- **Report results**: add a new entry to `results` with the match `id` and
  scores. The standings table updates automatically based on results.
- **Refresh the homepage**: update `meta.lastUpdatedISO` and
  `meta.signatureLine` to keep the Live Proof section current.

## Deployment

1. Build the site:
   ```bash
   npm run build
   ```
2. Start the production server:
   ```bash
   npm run start
   ```

Deploy to platforms like Vercel or Netlify by selecting the project root and
using the build command `npm run build` and output `next start` (or platform
defaults for Next.js).
