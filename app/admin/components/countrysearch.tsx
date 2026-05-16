"use client";

import { useState, useRef, useEffect } from "react";

// ─── Liste des pays ───────────────────────────────────────────────────────────
export const COUNTRIES: { code: string; name: string }[] = [
  { code: "AD", name: "Andorre" },
  { code: "AE", name: "Émirats arabes unis" },
  { code: "AF", name: "Afghanistan" },
  { code: "AG", name: "Antigua-et-Barbuda" },
  { code: "AL", name: "Albanie" },
  { code: "AM", name: "Arménie" },
  { code: "AO", name: "Angola" },
  { code: "AR", name: "Argentine" },
  { code: "AT", name: "Autriche" },
  { code: "AU", name: "Australie" },
  { code: "AZ", name: "Azerbaïdjan" },
  { code: "BA", name: "Bosnie-Herzégovine" },
  { code: "BB", name: "Barbade" },
  { code: "BD", name: "Bangladesh" },
  { code: "BE", name: "Belgique" },
  { code: "BF", name: "Burkina Faso" },
  { code: "BG", name: "Bulgarie" },
  { code: "BH", name: "Bahreïn" },
  { code: "BI", name: "Burundi" },
  { code: "BJ", name: "Bénin" },
  { code: "BN", name: "Brunei" },
  { code: "BO", name: "Bolivie" },
  { code: "BR", name: "Brésil" },
  { code: "BS", name: "Bahamas" },
  { code: "BT", name: "Bhoutan" },
  { code: "BW", name: "Botswana" },
  { code: "BY", name: "Biélorussie" },
  { code: "BZ", name: "Belize" },
  { code: "CA", name: "Canada" },
  { code: "CD", name: "Congo (RDC)" },
  { code: "CF", name: "Centrafrique" },
  { code: "CG", name: "Congo" },
  { code: "CH", name: "Suisse" },
  { code: "CI", name: "Côte d'Ivoire" },
  { code: "CL", name: "Chili" },
  { code: "CM", name: "Cameroun" },
  { code: "CN", name: "Chine" },
  { code: "CO", name: "Colombie" },
  { code: "CR", name: "Costa Rica" },
  { code: "CU", name: "Cuba" },
  { code: "CV", name: "Cap-Vert" },
  { code: "CY", name: "Chypre" },
  { code: "CZ", name: "République tchèque" },
  { code: "DE", name: "Allemagne" },
  { code: "DJ", name: "Djibouti" },
  { code: "DK", name: "Danemark" },
  { code: "DM", name: "Dominique" },
  { code: "DO", name: "République dominicaine" },
  { code: "DZ", name: "Algérie" },
  { code: "EC", name: "Équateur" },
  { code: "EE", name: "Estonie" },
  { code: "EG", name: "Égypte" },
  { code: "ER", name: "Érythrée" },
  { code: "ES", name: "Espagne" },
  { code: "ET", name: "Éthiopie" },
  { code: "FI", name: "Finlande" },
  { code: "FJ", name: "Fidji" },
  { code: "FM", name: "Micronésie" },
  { code: "FR", name: "France" },
  { code: "GA", name: "Gabon" },
  { code: "GB", name: "Royaume-Uni" },
  { code: "GD", name: "Grenade" },
  { code: "GE", name: "Géorgie" },
  { code: "GH", name: "Ghana" },
  { code: "GM", name: "Gambie" },
  { code: "GN", name: "Guinée" },
  { code: "GQ", name: "Guinée équatoriale" },
  { code: "GR", name: "Grèce" },
  { code: "GT", name: "Guatemala" },
  { code: "GW", name: "Guinée-Bissau" },
  { code: "GY", name: "Guyana" },
  { code: "HN", name: "Honduras" },
  { code: "HR", name: "Croatie" },
  { code: "HT", name: "Haïti" },
  { code: "HU", name: "Hongrie" },
  { code: "ID", name: "Indonésie" },
  { code: "IE", name: "Irlande" },
  { code: "IL", name: "Israël" },
  { code: "IN", name: "Inde" },
  { code: "IQ", name: "Irak" },
  { code: "IR", name: "Iran" },
  { code: "IS", name: "Islande" },
  { code: "IT", name: "Italie" },
  { code: "JM", name: "Jamaïque" },
  { code: "JO", name: "Jordanie" },
  { code: "JP", name: "Japon" },
  { code: "KE", name: "Kenya" },
  { code: "KG", name: "Kirghizistan" },
  { code: "KH", name: "Cambodge" },
  { code: "KI", name: "Kiribati" },
  { code: "KM", name: "Comores" },
  { code: "KN", name: "Saint-Kitts-et-Nevis" },
  { code: "KP", name: "Corée du Nord" },
  { code: "KR", name: "Corée du Sud" },
  { code: "KW", name: "Koweït" },
  { code: "KZ", name: "Kazakhstan" },
  { code: "LA", name: "Laos" },
  { code: "LB", name: "Liban" },
  { code: "LC", name: "Sainte-Lucie" },
  { code: "LI", name: "Liechtenstein" },
  { code: "LK", name: "Sri Lanka" },
  { code: "LR", name: "Liberia" },
  { code: "LS", name: "Lesotho" },
  { code: "LT", name: "Lituanie" },
  { code: "LU", name: "Luxembourg" },
  { code: "LV", name: "Lettonie" },
  { code: "LY", name: "Libye" },
  { code: "MA", name: "Maroc" },
  { code: "MC", name: "Monaco" },
  { code: "MD", name: "Moldavie" },
  { code: "ME", name: "Monténégro" },
  { code: "MG", name: "Madagascar" },
  { code: "MH", name: "Îles Marshall" },
  { code: "MK", name: "Macédoine du Nord" },
  { code: "ML", name: "Mali" },
  { code: "MM", name: "Myanmar" },
  { code: "MN", name: "Mongolie" },
  { code: "MR", name: "Mauritanie" },
  { code: "MT", name: "Malte" },
  { code: "MU", name: "Maurice" },
  { code: "MV", name: "Maldives" },
  { code: "MW", name: "Malawi" },
  { code: "MX", name: "Mexique" },
  { code: "MY", name: "Malaisie" },
  { code: "MZ", name: "Mozambique" },
  { code: "NA", name: "Namibie" },
  { code: "NE", name: "Niger" },
  { code: "NG", name: "Nigeria" },
  { code: "NI", name: "Nicaragua" },
  { code: "NL", name: "Pays-Bas" },
  { code: "NO", name: "Norvège" },
  { code: "NP", name: "Népal" },
  { code: "NR", name: "Nauru" },
  { code: "NZ", name: "Nouvelle-Zélande" },
  { code: "OM", name: "Oman" },
  { code: "PA", name: "Panama" },
  { code: "PE", name: "Pérou" },
  { code: "PG", name: "Papouasie-Nouvelle-Guinée" },
  { code: "PH", name: "Philippines" },
  { code: "PK", name: "Pakistan" },
  { code: "PL", name: "Pologne" },
  { code: "PT", name: "Portugal" },
  { code: "PW", name: "Palaos" },
  { code: "PY", name: "Paraguay" },
  { code: "QA", name: "Qatar" },
  { code: "RO", name: "Roumanie" },
  { code: "RS", name: "Serbie" },
  { code: "RU", name: "Russie" },
  { code: "RW", name: "Rwanda" },
  { code: "SA", name: "Arabie saoudite" },
  { code: "SB", name: "Îles Salomon" },
  { code: "SC", name: "Seychelles" },
  { code: "SD", name: "Soudan" },
  { code: "SE", name: "Suède" },
  { code: "SG", name: "Singapour" },
  { code: "SI", name: "Slovénie" },
  { code: "SK", name: "Slovaquie" },
  { code: "SL", name: "Sierra Leone" },
  { code: "SM", name: "Saint-Marin" },
  { code: "SN", name: "Sénégal" },
  { code: "SO", name: "Somalie" },
  { code: "SR", name: "Suriname" },
  { code: "SS", name: "Soudan du Sud" },
  { code: "ST", name: "São Tomé-et-Príncipe" },
  { code: "SV", name: "Salvador" },
  { code: "SY", name: "Syrie" },
  { code: "SZ", name: "Eswatini" },
  { code: "TD", name: "Tchad" },
  { code: "TG", name: "Togo" },
  { code: "TH", name: "Thaïlande" },
  { code: "TJ", name: "Tadjikistan" },
  { code: "TL", name: "Timor oriental" },
  { code: "TM", name: "Turkménistan" },
  { code: "TN", name: "Tunisie" },
  { code: "TO", name: "Tonga" },
  { code: "TR", name: "Turquie" },
  { code: "TT", name: "Trinité-et-Tobago" },
  { code: "TV", name: "Tuvalu" },
  { code: "TZ", name: "Tanzanie" },
  { code: "UA", name: "Ukraine" },
  { code: "UG", name: "Ouganda" },
  { code: "US", name: "États-Unis" },
  { code: "UY", name: "Uruguay" },
  { code: "UZ", name: "Ouzbékistan" },
  { code: "VA", name: "Vatican" },
  { code: "VC", name: "Saint-Vincent-et-les-Grenadines" },
  { code: "VE", name: "Venezuela" },
  { code: "VN", name: "Viêt Nam" },
  { code: "VU", name: "Vanuatu" },
  { code: "WS", name: "Samoa" },
  { code: "YE", name: "Yémen" },
  { code: "ZA", name: "Afrique du Sud" },
  { code: "ZM", name: "Zambie" },
  { code: "ZW", name: "Zimbabwe" },
];

function toFlag(code: string) {
  const upper = code.toUpperCase();
  return String.fromCodePoint(...Array.from(upper).map((c) => 127397 + c.charCodeAt(0)));
}

// ─── Composant ────────────────────────────────────────────────────────────────
type CountrySearchProps = {
  value: string | null;
  onChange: (code: string | null) => void;
  label?: string;
};

export function CountrySearch({ value, onChange, label }: CountrySearchProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = COUNTRIES.find((c) => c.code === value) ?? null;

  const filtered = query.trim()
    ? COUNTRIES.filter(
        (c) =>
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          c.code.toLowerCase().includes(query.toLowerCase())
      )
    : COUNTRIES;

  // Fermer si clic en dehors
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      {label ? (
        <label className="block text-xs uppercase tracking-[0.25em] text-white/50 mb-1">
          {label}
        </label>
      ) : null}

      {/* Bouton déclencheur */}
      <button
        type="button"
        onClick={() => {
          setOpen((prev) => !prev);
          setQuery("");
        }}
        className="surface-input w-full text-left flex items-center gap-2"
      >
        {selected ? (
          <>
            <span>{toFlag(selected.code)}</span>
            <span>{selected.name}</span>
            <span className="ml-auto text-white/30 text-xs">{selected.code}</span>
          </>
        ) : (
          <span className="text-white/40">— Aucun pays —</span>
        )}
      </button>

      {/* Dropdown */}
      {open ? (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-white/10 bg-[#0e1620] shadow-xl">
          {/* Recherche */}
          <div className="p-2 border-b border-white/10">
            <input
              autoFocus
              type="text"
              placeholder="Rechercher…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded bg-black/30 border border-white/10 px-2 py-1 text-sm text-white placeholder:text-white/30 focus:outline-none"
            />
          </div>

          {/* Liste */}
          <ul className="max-h-52 overflow-y-auto py-1">
            {/* Option vide */}
            <li>
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                  setQuery("");
                }}
                className="w-full px-3 py-1.5 text-left text-sm text-white/40 hover:bg-white/5"
              >
                — Aucun pays —
              </button>
            </li>

            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-white/30">Aucun résultat</li>
            ) : (
              filtered.map((country) => (
                <li key={country.code}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(country.code);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={`w-full px-3 py-1.5 text-left text-sm flex items-center gap-2 hover:bg-white/5 ${
                      value === country.code ? "bg-white/10 text-white" : "text-white/80"
                    }`}
                  >
                    <span>{toFlag(country.code)}</span>
                    <span>{country.name}</span>
                    <span className="ml-auto text-white/30 text-xs">{country.code}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
