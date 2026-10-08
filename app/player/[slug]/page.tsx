import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { getLocale } from "../../lib/i18n";
import { getPlayerProfile, type PlayerProfile } from "../../../src/lib/players/profile";
import { getDiscordAvatarUrl } from "../../../src/lib/players/discord-avatar";
import { getSiteUser } from "../../../src/lib/auth/site-user";
import { BIO_MAX_LENGTH, getLikeState } from "../../../src/lib/players/social";
import LikeButton from "../../components/LikeButton";
import BioEditor from "../../components/BioEditor";
import { FlameIcon, GlobeIcon, TrophyIcon } from "../../components/icons";

export const dynamic = "force-dynamic";

// Même visuel que la carte !tier du bot : tier, rang, points, Ballon d'Or, Golden Nullser, pays...
const TIER_IMAGE: Record<string, string> = {
  "Tier S": "/TierS.webp",
  "Tier A": "/TierA.webp",
  "Tier B": "/TierB.webp",
  "Tier C": "/TierC.webp",
  "Tier D": "/TierD.webp",
  "Tier E": "/TierE.webp",
};

const copy = {
  fr: {
    noTier: "No Tier",
    achievements: "Palmarès",
    noAchievements: "Aucun palmarès renseigné pour le moment.",
    rank: "Classement global",
    points: "Points",
    ballonDor: "Ballon d'Or",
    goldenNullser: "Golden Nullser",
    country: "Pays",
    unspecified: "Non spécifié",
    earnings: "Gains",
    winStreak: "Winstreak",
    team: "Équipe",
    unranked: "Non classé",
    back: "← Retour au classement",
    bio: "À propos",
    bioEmptyOwner: "Ajoute une description personnelle pour te présenter.",
    bioEdit: "Modifier",
    bioSave: "Enregistrer",
    bioCancel: "Annuler",
    bioPlaceholder: "Présente-toi en quelques mots…",
    like: "Aimer ce profil",
    unlike: "Retirer mon cœur",
    likeLogin: "Connecte-toi avec Discord pour liker",
    likeOwn: "Tu ne peux pas liker ton propre profil",
    error: "Une erreur est survenue, réessaie.",
  },
  en: {
    noTier: "No Tier",
    achievements: "Achievements",
    noAchievements: "No achievements listed yet.",
    rank: "Global Rank",
    points: "Points",
    ballonDor: "Ballon D'Or",
    goldenNullser: "Golden Nullser",
    country: "Country",
    unspecified: "Unspecified",
    earnings: "Earnings",
    winStreak: "Winstreak",
    team: "Team",
    unranked: "Unranked",
    back: "← Back to leaderboard",
    bio: "About",
    bioEmptyOwner: "Add a personal description to introduce yourself.",
    bioEdit: "Edit",
    bioSave: "Save",
    bioCancel: "Cancel",
    bioPlaceholder: "Introduce yourself in a few words…",
    like: "Like this profile",
    unlike: "Remove my heart",
    likeLogin: "Log in with Discord to like",
    likeOwn: "You can't like your own profile",
    error: "Something went wrong, please try again.",
  },
};

/** Rend une ligne de palmarès en gras sur les **...** (même syntaxe que Discord), sans HTML brut. */
function renderLine(line: string) {
  return line.split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={index} className="font-semibold text-[color:var(--color-text)]">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={index}>{part}</span>
    )
  );
}

/** Palmarès : lignes de la description, hors titre "Achievements" (déjà affiché en en-tête). */
function getAchievementLines(description: string) {
  return description
    .split("\n")
    .map((line) => line.replace(/^\s*(?:[-•*]\s+)/, "").trim())
    .filter((line) => line && !/^\W*\**\s*(achievements?|palmar[eè]s)\s*\**\W*$/i.test(line));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const profile = await getPlayerProfile(params.slug).catch(() => null);
  return { title: profile ? profile.name : "Player" };
}

export default async function PlayerProfilePage({ params }: { params: { slug: string } }) {
  const locale = getLocale();
  const content = copy[locale];

  let profile: PlayerProfile | null = null;
  try {
    profile = await getPlayerProfile(params.slug);
  } catch (error) {
    console.error("[player profile]", error);
  }
  if (!profile) {
    console.warn("[player profile] not found for slug:", params.slug);
    notFound();
  }

  // Lien via ID Discord (ou ancien slug) : on redirige vers l'URL propre /player/<pseudo>
  if (decodeURIComponent(params.slug).toLowerCase() !== profile.slug) {
    redirect(`/player/${profile.slug}`);
  }

  const viewer = await getSiteUser();
  const isOwner = Boolean(viewer && profile.discordId && viewer.discordId === profile.discordId);
  const [avatarUrl, likeState] = await Promise.all([
    getDiscordAvatarUrl(profile.discordId),
    getLikeState(profile.id, viewer?.discordId ?? null),
  ]);
  const tierLabel = profile.tier ?? content.noTier;
  const achievementLines = getAchievementLines(profile.description);
  const formatMoney = (value: number) =>
    `€${value.toLocaleString(locale === "fr" ? "fr-FR" : "en-US", { maximumFractionDigits: 2 })}`;

  const stats: Array<{ label: string; value: ReactNode }> = [
    { label: content.rank, value: profile.rank ? `#${profile.rank}` : content.unranked },
    { label: content.points, value: String(Math.round(profile.points)) },
    { label: content.ballonDor, value: String(profile.ballonDor) },
    { label: content.goldenNullser, value: String(profile.goldenNullser) },
    {
      label: content.country,
      value:
        profile.countryCode === "ZZ" || !/^[A-Z]{2}$/.test(profile.countryCode) ? (
          <span className="inline-flex items-center gap-2">
            <GlobeIcon className="h-5 w-5 text-[color:var(--color-text-muted)]" />
            {content.unspecified}
          </span>
        ) : (
          <span className="inline-flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://flagcdn.com/w40/${profile.countryCode.toLowerCase()}.png`}
              alt=""
              className="h-4 w-6 rounded-sm object-cover"
            />
            {profile.countryCode}
          </span>
        ),
    },
  ];
  if (profile.earnings > 0) stats.push({ label: content.earnings, value: formatMoney(profile.earnings) });
  if (profile.winStreak > 0) {
    stats.push({
      label: content.winStreak,
      value: (
        <span className="inline-flex items-center gap-2">
          <FlameIcon className="h-5 w-5 text-orange-400" />
          {profile.winStreak}
        </span>
      ),
    });
  }
  if (profile.teamName) {
    stats.push({
      label: content.team,
      value: profile.teamTag ? `${profile.teamName} [${profile.teamTag}]` : profile.teamName,
    });
  }

  return (
    <main className="min-h-screen px-4 pb-20 pt-10 text-[color:var(--color-text)]">
      <div className="page-stack page-stack--tight mx-auto max-w-3xl">
        <a
          href="/leaderboard"
          className="mb-4 inline-block text-xs uppercase tracking-[0.12em] text-[color:var(--color-text-faint)] transition hover:text-[color:var(--color-text)]"
        >
          {content.back}
        </a>

        <section className="section-card space-y-8 border border-[color:var(--color-border-soft)]">
          {/* En-tête : avatar Discord + pseudo + badge tier */}
          <div className="flex flex-wrap items-center gap-5">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={profile.name}
                className="h-24 w-24 rounded-2xl border border-[color:var(--color-border)] object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-[color:var(--color-border)] text-3xl font-semibold">
                {profile.name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-3xl font-semibold">{profile.name}</h1>
              <div className="mt-2 flex items-center gap-3">
                {profile.tier && TIER_IMAGE[profile.tier] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={TIER_IMAGE[profile.tier]} alt={tierLabel} className="h-10 w-10 object-contain" />
                ) : null}
                <span className="text-sm font-semibold uppercase tracking-[0.14em] text-[color:var(--color-accent)]">
                  {tierLabel}
                </span>
              </div>
            </div>
            <LikeButton
              playerId={profile.id}
              initialCount={likeState.count}
              initialLiked={likeState.liked}
              loginHref={viewer ? null : `/auth/login?next=${encodeURIComponent(`/player/${profile.slug}`)}`}
              disabled={isOwner}
              labels={{
                like: content.like,
                unlike: content.unlike,
                login: content.likeLogin,
                own: content.likeOwn,
                error: content.error,
              }}
            />
          </div>

          {/* Bio personnelle (éditable par le propriétaire connecté) */}
          <BioEditor
            initialBio={profile.bio}
            isOwner={isOwner}
            maxLength={BIO_MAX_LENGTH}
            labels={{
              title: content.bio,
              empty: "",
              emptyOwner: content.bioEmptyOwner,
              edit: content.bioEdit,
              save: content.bioSave,
              cancel: content.bioCancel,
              placeholder: content.bioPlaceholder,
              error: content.error,
            }}
          />

          {/* Stats : mêmes champs que la carte !tier */}
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-[10px] border border-[color:var(--color-border-soft)] bg-[rgba(255,255,255,0.03)] p-4"
              >
                <dt className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--color-text-faint)]">
                  {stat.label}
                </dt>
                <dd className="mt-1 text-lg font-semibold">{stat.value}</dd>
              </div>
            ))}
          </dl>

          {/* Palmarès (description du profil, comme sur Discord) */}
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-[color:var(--color-text-faint)]">
              <TrophyIcon className="h-4 w-4" />
              {content.achievements}
            </h2>
            {achievementLines.length > 0 ? (
              <ul className="space-y-1.5 text-sm text-[color:var(--color-text-muted)]">
                {achievementLines.map((line, index) => (
                  <li key={index}>{renderLine(line)}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[color:var(--color-text-muted)]">{content.noAchievements}</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
