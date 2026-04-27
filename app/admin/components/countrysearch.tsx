// app/admin/components/CountrySearch.tsx
"use client";

import { useMemo, useState } from "react";

export const COUNTRIES = [
  { code: "AF", name: "Afghanistan", flag: "🇦🇫" },
  { code: "AL", name: "Albanie", flag: "🇦🇱" },
  { code: "DZ", name: "Algérie", flag: "🇩🇿" },
  { code: "AD", name: "Andorre", flag: "🇦🇩" },
  { code: "AO", name: "Angola", flag: "🇦🇴" },
  { code: "AG", name: "Antigua-et-Barbuda", flag: "🇦🇬" },
  { code: "SA", name: "Arabie Saoudite", flag: "🇸🇦" },
  { code: "AR", name: "Argentine", flag: "🇦🇷" },
  { code: "AM", name: "Arménie", flag: "🇦🇲" },
  { code: "AU", name: "Australie", flag: "🇦🇺" },
  { code: "AT", name: "Autriche", flag: "🇦🇹" },
  { code: "AZ", name: "Azerbaïdjan", flag: "🇦🇿" },
  { code: "BS", name: "Bahamas", flag: "🇧🇸" },
  { code: "BH", name: "Bahreïn", flag: "🇧🇭" },
  { code: "BD", name: "Bangladesh", flag: "🇧🇩" },
  { code: "BB", name: "Barbade", flag: "🇧🇧" },
  { code: "BE", name: "Belgique", flag: "🇧🇪" },
  { code: "BZ", name: "Belize", flag: "🇧🇿" },
  { code: "BJ", name: "Bénin", flag: "🇧🇯" },
  { code: "BT", name: "Bhoutan", flag: "🇧🇹" },
  { code: "BY", name: "Biélorussie", flag: "🇧🇾" },
  { code: "MM", name: "Birmanie", flag: "🇲🇲" },
  { code: "BO", name: "Bolivie", flag: "🇧🇴" },
  { code: "BA", name: "Bosnie-Herzégovine", flag: "🇧🇦" },
  { code: "BW", name: "Botswana", flag: "🇧🇼" },
  { code: "BR", name: "Brésil", flag: "🇧🇷" },
  { code: "BN", name: "Brunei", flag: "🇧🇳" },
  { code: "BG", name: "Bulgarie", flag: "🇧🇬" },
  { code: "BF", name: "Burkina Faso", flag: "🇧🇫" },
  { code: "BI", name: "Burundi", flag: "🇧🇮" },
  { code: "KH", name: "Cambodge", flag: "🇰🇭" },
  { code: "CM", name: "Cameroun", flag: "🇨🇲" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "CV", name: "Cap-Vert", flag: "🇨🇻" },
  { code: "KZ", name: "Kazakhstan", flag: "🇰🇿" },
  { code: "QA", name: "Qatar", flag: "🇶🇦" },
  { code: "KE", name: "Kenya", flag: "🇰🇪" },
  { code: "KG", name: "Kirghizistan", flag: "🇰🇬" },
  { code: "KI", name: "Kiribati", flag: "🇰🇮" },
  { code: "KW", name: "Koweït", flag: "🇰🇼" },
  { code: "LA", name: "Laos", flag: "🇱🇦" },
  { code: "LS", name: "Lesotho", flag: "🇱🇸" },
  { code: "LV", name: "Lettonie", flag: "🇱🇻" },
  { code: "LB", name: "Liban", flag: "🇱🇧" },
  { code: "LR", name: "Liberia", flag: "🇱🇷" },
  { code: "LY", name: "Libye", flag: "🇱🇾" },
  { code: "LI", name: "Liechtenstein", flag: "🇱🇮" },
  { code: "LT", name: "Lituanie", flag: "🇱🇹" },
  { code: "LU", name: "Luxembourg", flag: "🇱🇺" },
  { code: "MG", name: "Madagascar", flag: "🇲🇬" },
  { code: "MY", name: "Malaisie", flag: "🇲🇾" },
  { code: "MW", name: "Malawi", flag: "🇲🇼" },
  { code: "MV", name: "Maldives", flag: "🇲🇻" },
  { code: "ML", name: "Mali", flag: "🇲🇱" },
  { code: "MT", name: "Malte", flag: "🇲🇹" },
  { code: "MA", name: "Maroc", flag: "🇲🇦" },
  { code: "MQ", name: "Martinique", flag: "🇲🇶" },
  { code: "MU", name: "Maurice", flag: "🇲🇺" },
  { code: "MR", name: "Mauritanie", flag: "🇲🇷" },
  { code: "MX", name: "Mexique", flag: "🇲🇽" },
  { code: "MD", name: "Moldavie", flag: "🇲🇩" },
  { code: "MC", name: "Monaco", flag: "🇲🇨" },
  { code: "MN", name: "Mongolie", flag: "🇲🇳" },
  { code: "ME", name: "Monténégro", flag: "🇲🇪" },
  { code: "MZ", name: "Mozambique", flag: "🇲🇿" },
  { code: "NA", name: "Namibie", flag: "🇳🇦" },
  { code: "NR", name: "Nauru", flag: "🇳🇷" },
  { code: "NP", name: "Népal", flag: "🇳🇵" },
  { code: "NI", name: "Nicaragua", flag: "🇳🇮" },
  { code: "NE", name: "Niger", flag: "🇳🇪" },
  { code: "NG", name: "Nigéria", flag: "🇳🇬" },
  { code: "NU", name: "Niue", flag: "🇳🇺" },
  { code: "NO", name: "Norvège", flag: "🇳🇴" },
  { code: "NZ", name: "Nouvelle-Zélande", flag: "🇳🇿" },
  { code: "OM", name: "Oman", flag: "🇴🇲" },
  { code: "UG", name: "Ouganda", flag: "🇺🇬" },
  { code: "UZ", name: "Ouzbékistan", flag: "🇺🇿" },
  { code: "PK", name: "Pakistan", flag: "🇵🇰" },
  { code: "PW", name: "Palaos", flag: "🇵🇼" },
  { code: "PA", name: "Panama", flag: "🇵🇦" },
  { code: "PG", name: "Papouasie-Nouvelle-Guinée", flag: "🇵🇬" },
  { code: "PY", name: "Paraguay", flag: "🇵🇾" },
  { code: "NL", name: "Pays-Bas", flag: "🇳🇱" },
  { code: "PE", name: "Pérou", flag: "🇵🇪" },
  { code: "PH", name: "Philippines", flag: "🇵🇭" },
  { code: "PL", name: "Pologne", flag: "🇵🇱" },
  { code: "PF", name: "Polynésie Française", flag: "🇵🇫" },
  { code: "PR", name: "Porto Rico", flag: "🇵🇷" },
  { code: "PT", name: "Portugal", flag: "🇵🇹" },
  { code: "RE", name: "Réunion", flag: "🇷🇪" },
  { code: "RO", name: "Roumanie", flag: "🇷🇴" },
  { code: "GB", name: "Royaume-Uni", flag: "🇬🇧" },
  { code: "RU", name: "Russie", flag: "🇷🇺" },
  { code: "RW", name: "Rwanda", flag: "🇷🇼" },
  { code: "EH", name: "Sahara Occidental", flag: "🇪🇭" },
  { code: "KN", name: "Saint-Christophe-et-Niévès", flag: "🇰🇳" },
  { code: "SM", name: "Saint-Marin", flag: "🇸🇲" },
  { code: "PM", name: "Saint-Pierre-et-Miquelon", flag: "🇵🇲" },
  { code: "VC", name: "Saint-Vincent-et-les-Grenadines", flag: "🇻🇨" },
  { code: "SH", name: "Sainte-Hélène", flag: "🇸🇭" },
  { code: "LC", name: "Sainte-Lucie", flag: "🇱🇨" },
  { code: "BL", name: "Saint-Barthélemy", flag: "🇧🇱" },
  { code: "MF", name: "Saint-Martin", flag: "🇲🇫" },
  { code: "ST", name: "São Tomé-et-Príncipe", flag: "🇸🇹" },
  { code: "SN", name: "Sénégal", flag: "🇸🇳" },
  { code: "RS", name: "Serbie", flag: "🇷🇸" },
  { code: "SG", name: "Singapour", flag: "🇸🇬" },
  { code: "SK", name: "Slovaquie", flag: "🇸🇰" },
  { code: "SI", name: "Slovénie", flag: "🇸🇮" },
  { code: "SO", name: "Somalie", flag: "🇸🇴" },
  { code: "SD", name: "Soudan", flag: "🇸🇩" },
  { code: "SS", name: "Soudan du Sud", flag: "🇸🇸" },
  { code: "SE", name: "Suède", flag: "🇸🇪" },
  { code: "CH", name: "Suisse", flag: "🇨🇭" },
  { code: "SJ", name: "Svalbard et Jan Mayen", flag: "🇸🇯" },
  { code: "SZ", name: "Swaziland", flag: "🇸🇿" },
  { code: "SY", name: "Syrie", flag: "🇸🇾" },
  { code: "TJ", name: "Tadjikistan", flag: "🇹🇯" },
  { code: "TW", name: "Taïwan", flag: "🇹🇼" },
  { code: "TZ", name: "Tanzanie", flag: "🇹🇿" },
  { code: "TD", name: "Tchad", flag: "🇹🇩" },
  { code: "CZ", name: "Tchéquie", flag: "🇨🇿" },
  { code: "TF", name: "Terres Australes Françaises", flag: "🇹🇫" },
  { code: "TH", name: "Thaïlande", flag: "🇹🇭" },
  { code: "TL", name: "Timor Oriental", flag: "🇹🇱" },
  { code: "TG", name: "Togo", flag: "🇹🇬" },
  { code: "TK", name: "Tokelau", flag: "🇹🇰" },
  { code: "TO", name: "Tonga", flag: "🇹🇴" },
  { code: "TT", name: "Trinité-et-Tobago", flag: "🇹🇹" },
  { code: "TN", name: "Tunisie", flag: "🇹🇳" },
  { code: "TM", name: "Turkménistan", flag: "🇹🇲" },
  { code: "TR", name: "Turquie", flag: "🇹🇷" },
  { code: "TV", name: "Tuvalu", flag: "🇹🇻" },
  { code: "UA", name: "Ukraine", flag: "🇺🇦" },
  { code: "UY", name: "Uruguay", flag: "🇺🇾" },
  { code: "VU", name: "Vanuatu", flag: "🇻🇺" },
  { code: "VA", name: "Vatican", flag: "🇻🇦" },
  { code: "VE", name: "Venezuela", flag: "🇻🇪" },
  { code: "VN", name: "Viêt Nam", flag: "🇻🇳" },
  { code: "EJ", name: "Îles Åland", flag: "🇪🇯" },
  { code: "BV", name: "Île Bouvet", flag: "🇧🇻" },
  { code: "CX", name: "Île Christmas", flag: "🇨🇽" },
  { code: "CC", name: "Îles Cocos", flag: "🇨🇨" },
  { code: "CK", name: "Îles Cook", flag: "🇨🇰" },
  { code: "FK", name: "Îles Malouines", flag: "🇫🇰" },
  { code: "FO", name: "Îles Féroé", flag: "🇫🇴" },
  { code: "GS", name: "Îles Géorgie du Sud et Sandwich du Sud", flag: "🇬🇸" },
  { code: "HK", name: "Hong Kong", flag: "🇭🇰" },
  { code: "IO", name: "Îles Britanniques de l'Océan Indien", flag: "🇮🇴" },
  { code: "MP", name: "Îles Mariannes du Nord", flag: "🇲🇵" },
  { code: "MH", name: "Îles Marshall", flag: "🇲🇭" },
  { code: "PN", name: "Îles Pitcairn", flag: "🇵🇳" },
  { code: "SB", name: "Îles Salomon", flag: "🇸🇧" },
  { code: "TC", name: "Îles Turques-et-Caïques", flag: "🇹🇨" },
  { code: "VI", name: "Îles Vierges des États-Unis", flag: "🇻🇮" },
  { code: "VG", name: "Îles Vierges Britanniques", flag: "🇻🇬" },
  { code: "UM", name: "Îles mineures éloignées des États-Unis", flag: "🇺🇲" },
  { code: "BM", name: "Bermudes", flag: "🇧🇲" },
  { code: "BQ", name: "Bonaire, Saint-Eustache et Saba", flag: "🇧🇶" },
  { code: "KY", name: "Îles Caïmans", flag: "🇰🇾" },
  { code: "CW", name: "Curaçao", flag: "🇨🇼" },
  { code: "SX", name: "Sint-Maarten", flag: "🇸🇽" },
  { code: "DJ", name: "Djibouti", flag: "🇩🇯" },
  { code: "DM", name: "Dominique", flag: "🇩🇲" },
  { code: "DO", name: "République Dominicaine", flag: "🇩🇴" },
  { code: "DE", name: "Allemagne", flag: "🇩🇪" },
  { code: "EG", name: "Égypte", flag: "🇪🇬" },
  { code: "AE", name: "Émirats Arabes Unis", flag: "🇦🇪" },
  { code: "EC", name: "Équateur", flag: "🇪🇨" },
  { code: "ER", name: "Érythrée", flag: "🇪🇷" },
  { code: "ES", name: "Espagne", flag: "🇪🇸" },
  { code: "EE", name: "Estonie", flag: "🇪🇪" },
  { code: "FM", name: "États Fédérés de Micronésie", flag: "🇫🇲" },
  { code: "US", name: "États-Unis", flag: "🇺🇸" },
  { code: "ET", name: "Éthiopie", flag: "🇪🇹" },
  { code: "FI", name: "Finlande", flag: "🇫🇮" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "GE", name: "Géorgie", flag: "🇬🇪" },
  { code: "GR", name: "Grèce", flag: "🇬🇷" },
  { code: "GD", name: "Grenade", flag: "🇬🇩" },
  { code: "GL", name: "Groenland", flag: "🇬🇱" },
  { code: "GP", name: "Guadeloupe", flag: "🇬🇵" },
  { code: "GU", name: "Guam", flag: "🇬🇺" },
  { code: "GT", name: "Guatémala", flag: "🇬🇹" },
  { code: "GG", name: "Guernesey", flag: "🇬🇬" },
  { code: "GN", name: "Guinée", flag: "🇬🇳" },
  { code: "GQ", name: "Guinée Équatoriale", flag: "🇬🇶" },
  { code: "GW", name: "Guinée-Bissau", flag: "🇬🇼" },
  { code: "GY", name: "Guyana", flag: "🇬🇾" },
  { code: "HT", name: "Haïti", flag: "🇭🇹" },
  { code: "HM", name: "Îles Heard et MacDonald", flag: "🇭🇲" },
  { code: "HN", name: "Honduras", flag: "🇭🇳" },
  { code: "HU", name: "Hongrie", flag: "🇭🇺" },
  { code: "IN", name: "Inde", flag: "🇮🇳" },
  { code: "ID", name: "Indonésie", flag: "🇮🇩" },
  { code: "IQ", name: "Irak", flag: "🇮🇶" },
  { code: "IR", name: "Iran", flag: "🇮🇷" },
  { code: "IE", name: "Irlande", flag: "🇮🇪" },
  { code: "IS", name: "Islande", flag: "🇮🇸" },
  { code: "IL", name: "Israël", flag: "🇮🇱" },
  { code: "IT", name: "Italie", flag: "🇮🇹" },
  { code: "JM", name: "Jamaïque", flag: "🇯🇲" },
  { code: "JP", name: "Japon", flag: "🇯🇵" },
  { code: "JE", name: "Jersey", flag: "🇯🇪" },
  { code: "JO", name: "Jordanie", flag: "🇯🇴" },
  { code: "GF", name: "Guyane Française", flag: "🇬🇫" },
  { code: "WF", name: "Wallis et Futuna", flag: "🇼🇫" },
  { code: "NC", name: "Nouvelle-Calédonie", flag: "🇳🇨" },
  { code: "AS", name: "Samoa Américaines", flag: "🇦🇸" },
  { code: "WS", name: "Samoa", flag: "🇼🇸" },
  { code: "SC", name: "Seychelles", flag: "🇸🇨" },
].sort((a, b) => a.name.localeCompare(b.name));

type CountrySearchProps = {
  value: string | null;
  onChange: (code: string | null) => void;
  label?: string;
  required?: boolean;
};

export function CountrySearch({
  value,
  onChange,
  label = "Pays",
  required = false,
}: CountrySearchProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return COUNTRIES;
    const query = search.toLowerCase().trim();
    return COUNTRIES.filter(
      (country) =>
        country.name.toLowerCase().includes(query) ||
        country.code.toLowerCase().includes(query)
    );
  }, [search]);

  const selected = COUNTRIES.find((c) => c.code === value);

  return (
    <div className="relative">
      <label className="block text-sm text-white/70 mb-2">
        {label}
        {required && <span className="text-red-400">*</span>}
      </label>

      <button
        type="button"
        onClick={() => setOpen(!open)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        className="w-full text-left flex items-center justify-between rounded-md border border-white/15 bg-black/30 px-3 py-2 text-white hover:bg-black/40 transition"
      >
        <span className="flex items-center gap-2">
          {selected ? (
            <>
              <span className="text-lg">{selected.flag}</span>
              <span>{selected.name}</span>
            </>
          ) : (
            <span className="text-white/50">Sélectionner un pays...</span>
          )}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-white/10 rounded-lg shadow-xl z-50">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tape Allemagne, FR, DE, etc..."
            className="w-full px-3 py-2 bg-slate-700 text-white text-sm border-b border-white/10 focus:outline-none focus:ring-0"
            autoFocus
          />
          <div className="max-h-64 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-3 text-sm text-slate-400">Aucun pays trouvé</div>
            ) : (
              filtered.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => {
                    onChange(country.code);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-amber-400/10 transition-colors flex items-center gap-2 ${
                    value === country.code ? "bg-amber-400/20 text-amber-200" : "text-slate-300"
                  }`}
                >
                  <span className="text-lg">{country.flag}</span>
                  <span className="font-medium">{country.code}</span>
                  <span>-</span>
                  <span>{country.name}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
