'use strict';

// Analyse un screenshot de fin de partie Brawl Stars via l'API Gemini
// et renvoie des stats structurées (winner, kills/deaths/dmg/heal/star player
// par joueur). Ne fait AUCUNE écriture en base — c'est au code appelant
// de valider/confirmer avant d'appliquer quoi que ce soit (Elo, notes, etc).

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    isEndScreen: { type: 'boolean', description: 'true si l\'image est bien un écran de fin de partie Brawl Stars lisible' },
    gameMode: { type: 'string' },
    mapName: { type: 'string' },
    winningTeam: { type: 'string', enum: ['blue', 'red', 'unknown'] },
    players: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          team: { type: 'string', enum: ['blue', 'red'] },
          playerName: { type: 'string' },
          brawler: { type: 'string' },
          kills: { type: 'integer' },
          deaths: { type: 'integer' },
          damage: { type: 'integer' },
          healing: { type: 'integer' },
          starPlayer: { type: 'boolean' }
        },
        required: ['team', 'playerName', 'brawler', 'kills', 'deaths']
      }
    },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'], description: 'ta confiance globale dans la lecture des chiffres' }
  },
  required: ['isEndScreen', 'winningTeam', 'players', 'confidence']
};

const PROMPT = `Tu analyses un screenshot d'écran de fin de partie du jeu mobile Brawl Stars.
Extrait précisément, pour CHAQUE joueur visible :
- son pseudo exact (playerName)
- le brawler qu'il a joué (brawler)
- kills, deaths, damage (dégâts infligés), healing (soin), et s'il est "star player" (étoile)
- son équipe (blue = bleu, red = rouge)

Détermine aussi l'équipe gagnante (winningTeam). Si l'écran indique "Victory"/"Défaite"
associé à une équipe, utilise ça. Si l'image n'est pas un écran de fin de partie
Brawl Stars ou que les chiffres ne sont pas lisibles, mets isEndScreen à false et
confidence à "low".

Ne devine JAMAIS un chiffre que tu ne peux pas lire clairement — dans ce cas laisse
confidence à "low" plutôt que d'inventer une valeur.`;

/**
 * @param {Buffer} imageBuffer
 * @param {string} mimeType ex: 'image/png'
 * @returns {Promise<object>} le JSON structuré (voir RESPONSE_SCHEMA)
 */
async function analyzeEndScreen(imageBuffer, mimeType = 'image/png') {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY manquante dans les variables d\'environnement.');
  }

  const base64Image = imageBuffer.toString('base64');

  const body = {
    contents: [
      {
        parts: [
          { text: PROMPT },
          { inline_data: { mime_type: mimeType, data: base64Image } }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0
    }
  };

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Gemini API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('Réponse Gemini vide ou inattendue.');
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new Error(`Impossible de parser le JSON renvoyé par Gemini: ${err.message}`);
  }

  return parsed;
}

module.exports = { analyzeEndScreen };
