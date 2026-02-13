const fs = require("fs");
const path = require("path");

const rootDir = process.cwd();
const staticDir = path.join(rootDir, ".next", "static");
const standaloneDir = path.join(rootDir, ".next", "standalone");
const standaloneStaticDir = path.join(standaloneDir, ".next", "static");
const publicDir = path.join(rootDir, "public");
const standalonePublicDir = path.join(standaloneDir, "public");

if (!fs.existsSync(staticDir)) {
  console.log("[postbuild] Aucun dossier .next/static trouvé, copie ignorée.");
  process.exit(0);
}

if (!fs.existsSync(standaloneDir)) {
  console.log("[postbuild] Aucun dossier .next/standalone trouvé, copie ignorée.");
  process.exit(0);
}

fs.mkdirSync(path.dirname(standaloneStaticDir), { recursive: true });
fs.rmSync(standaloneStaticDir, { recursive: true, force: true });
fs.cpSync(staticDir, standaloneStaticDir, { recursive: true });
console.log("[postbuild] Assets Next copiés vers .next/standalone/.next/static.");

if (!fs.existsSync(publicDir)) {
  console.log("[postbuild] Aucun dossier public trouvé, copie ignorée.");
  process.exit(0);
}

fs.rmSync(standalonePublicDir, { recursive: true, force: true });
fs.cpSync(publicDir, standalonePublicDir, { recursive: true });
console.log("[postbuild] Assets publics copiés vers .next/standalone/public.");
