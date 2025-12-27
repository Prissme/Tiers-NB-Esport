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

- `league`: Overall league metadata (name, season, broadcast).
- `teams`: Team list with `id`, `name`, `tag`, `logo`, and `roster`.
- `matches`: Schedule entries with `day`, `date`, `time`, `home`, and `away`.
- `standings`: Rows with `teamId`, `wins`, `losses`, and `diff`.
- `rulebook`: Rule sections used by the rulebook page.

### Common Updates

- **Add a team**: Add a new object to `teams` and reference its `id` inside
  `matches` and `standings`.
- **Update schedule**: Add or edit entries in `matches`. The schedule groups
  matches by the `day` field.
- **Refresh standings**: Update `wins`, `losses`, and `diff` in the
  `standings` array.

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
