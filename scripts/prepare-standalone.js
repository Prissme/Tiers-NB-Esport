const fs = require("fs");
const path = require("path");

const rootDir = process.cwd();
const staticDir = path.join(rootDir, ".next", "static");
const standaloneDir = path.join(rootDir, ".next", "standalone");
const targetDir = path.join(standaloneDir, ".next", "static");

if (!fs.existsSync(staticDir)) {
  console.log("[postbuild] Aucun dossier .next/static trouvé, copie ignorée.");
  process.exit(0);
}

if (!fs.existsSync(standaloneDir)) {
  console.log("[postbuild] Aucun dossier .next/standalone trouvé, copie ignorée.");
  process.exit(0);
}

fs.mkdirSync(path.dirname(targetDir), { recursive: true });
fs.rmSync(targetDir, { recursive: true, force: true });
fs.cpSync(staticDir, targetDir, { recursive: true });
console.log("[postbuild] Assets statiques copiés vers .next/standalone/.next/static.");
