'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Callout from '../components/Callout';
import MetricCard from '../components/MetricCard';
import SectionHeader from '../components/SectionHeader';
import Tag from '../components/Tag';
import ContributorList, { ContributorItem } from './components/ContributorList';
import PrizePoolBar from './components/PrizePoolBar';
import UnlockableTiers, { UnlockableTier } from './components/UnlockableTiers';

interface PrizePoolResponse {
  tournament: {
    id: string;
    name: string;
    prize_goal: number;
    current_amount: number;
    status: string;
  };
  total: number;
  contributors: ContributorItem[];
}

const tournamentId = '00000000-0000-0000-0000-000000000001';

const tiers: UnlockableTier[] = [
  {
    label: 'Casters pros',
    amount: 500,
    icon: '🎤',
    description: 'Une équipe de casting pro pour sublimer la finale.',
  },
  {
    label: 'Kit streaming renforcé',
    amount: 1200,
    icon: '📡',
    description: 'Overlays et intros personnalisées en live.',
  },
  {
    label: 'MVP Awards',
    amount: 2000,
    icon: '🏆',
    description: 'Trophées custom et récompenses sponsorisées.',
  },
  {
    label: 'Showmatch All-Star',
    amount: 3500,
    icon: '⚡',
    description: "Un match d'exhibition avec les meilleurs joueurs.",
  },
];

export default function PrizePoolClient() {
  const [data, setData] = useState<PrizePoolResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('25');
  const [anonymous, setAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchPrizePool = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/prizepool/${tournamentId}`);
      if (!response.ok) {
        throw new Error('Impossible de charger la cagnotte.');
      }
      const payload = (await response.json()) as PrizePoolResponse;
      setData(payload);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrizePool();
  }, [fetchPrizePool]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccess(null);
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch('/api/contributions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tournamentId,
          name: name.trim(),
          amount: Number(amount),
          anonymous,
        }),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload?.error ?? 'Erreur lors de la contribution.');
      }

      setSuccess('Merci ! Votre paiement Stripe (simulé) est validé.');
      setName('');
      setAmount('25');
      setAnonymous(false);
      await fetchPrizePool();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue.');
    } finally {
      setSubmitting(false);
    }
  };

  const currentAmount = data?.total ?? 0;
  const goalAmount = data?.tournament.prize_goal ?? 2000;

  const stats = useMemo(
    () => [
      { label: 'Contributeurs', value: `${data?.contributors.length ?? 0}` },
      { label: 'Objectif', value: `${goalAmount.toLocaleString('fr-FR')}€` },
      { label: 'Statut', value: data?.tournament.status ?? 'En cours' },
    ],
    [data?.contributors.length, data?.tournament.status, goalAmount]
  );

  return (
    <div className="page-stack">
      <section className="section-card dominant-section space-y-8">
        <SectionHeader
          kicker="Cagnotte"
          title="Cagnotte communautaire"
          description="Financement pour la production et les récompenses."
          tone="dominant"
        />
        <div className="flex flex-wrap items-center gap-3">
          <Tag label="Cagnotte" />
          <Tag label="LFN" />
          <Tag label="Casting" />
        </div>
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <div className="rounded-[14px] bg-slate-950/70 p-6 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
              {loading ? (
                <div className="text-sm text-muted">Chargement...</div>
              ) : (
                <PrizePoolBar current={currentAmount} goal={goalAmount} />
              )}
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-[10px] bg-slate-900/70 px-4 py-3"
                  >
                    <div className="text-xs uppercase tracking-wider text-utility">
                      {stat.label}
                    </div>
                    <div className="mt-2 text-lg font-semibold text-white">{stat.value}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <MetricCard
                label="Casting"
                value="Pro"
                detail="Interviews, narration et highlights."
              />
              <MetricCard
                label="Streaming"
                value="HD"
                detail="Overlays et design live."
              />
              <MetricCard
                label="Communauté"
                value="Impact"
                detail="Actions pour la communauté."
              />
            </div>
            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-white">Paliers débloquables</h2>
              <UnlockableTiers tiers={tiers} currentAmount={currentAmount} />
            </section>
          </div>

          <div className="space-y-6">
            <div className="rounded-[14px] bg-slate-950/70 p-6">
              <h2 className="text-xl font-semibold text-white">Participer</h2>
              <p className="mt-2 text-sm text-muted">
                Paiement Stripe simulé pour le MVP. Contribution visible immédiatement.
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="text-xs uppercase tracking-wider text-utility">Pseudo</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    disabled={anonymous}
                    placeholder="CyberRunner"
                    className="mt-2 w-full rounded-[10px] bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none transition focus:outline-none focus:ring-2 focus:ring-white/10"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs uppercase tracking-wider text-utility">Montant</label>
                    <input
                      type="number"
                      min={5}
                      step={5}
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      className="mt-2 w-full rounded-[10px] bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none transition focus:outline-none focus:ring-2 focus:ring-white/10"
                    />
                  </div>
                  <div className="flex items-end gap-3 rounded-[10px] bg-slate-950/60 px-4 py-3">
                    <input
                      id="anonymous"
                      type="checkbox"
                      checked={anonymous}
                      onChange={(event) => setAnonymous(event.target.checked)}
                      className="h-4 w-4 rounded border-white/20 bg-transparent"
                    />
                    <label htmlFor="anonymous" className="text-sm text-slate-200">
                      Contribution anonyme
                    </label>
                  </div>
                </div>

                {error ? (
                  <p className="rounded-[10px] bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {error}
                  </p>
                ) : null}
                {success ? (
                  <p className="rounded-[10px] bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                    {success}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-[10px] bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? 'Traitement...' : 'Contribuer'}
                </button>
              </form>
            </div>

            <section className="rounded-[14px] bg-slate-950/70 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Contributeurs</h2>
                <span className="text-xs text-utility">Dernières contributions</span>
              </div>
              {loading ? (
                <div className="mt-4 text-sm text-muted">Chargement des contributions...</div>
              ) : (
                <ContributorList items={data?.contributors ?? []} />
              )}
            </section>
          </div>
        </div>
      </section>

      <div className="secondary-section">
        <Callout
          title="Cagnotte pour la production"
          description="Chaque contribution améliore la production et les récompenses."
        />
      </div>
    </div>
  );
}
