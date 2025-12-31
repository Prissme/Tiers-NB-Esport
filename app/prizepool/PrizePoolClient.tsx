'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import PrizePoolBar from './components/PrizePoolBar';
import ContributorList, { ContributorItem } from './components/ContributorList';
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
    label: 'Kit streaming premium',
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
    description: 'Un match d\'exhibition avec les meilleurs joueurs.',
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
      { label: 'Contributeurs', value: data?.contributors.length ?? 0 },
      { label: 'Objectif', value: `${goalAmount.toLocaleString('fr-FR')}€` },
      { label: 'Statut', value: data?.tournament.status ?? 'En cours' },
    ],
    [data?.contributors.length, data?.tournament.status, goalAmount]
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-1 text-xs uppercase tracking-[0.2em] text-emerald-200">
                Cagnotte communautaire
              </div>
              <h1 className="text-3xl font-bold text-white md:text-4xl">
                Prizepool {data?.tournament.name ?? 'Tiers NB Esport'}
              </h1>
              <p className="text-sm text-emerald-200/70">
                Boostez la compétition avec une cagnotte participative. Chaque contribution débloque des expériences premium pour les joueurs et le public.
              </p>
            </div>

            <div className="rounded-3xl border border-emerald-500/20 bg-slate-950/70 p-6 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
              {loading ? (
                <div className="text-sm text-emerald-200/60">Chargement...</div>
              ) : (
                <PrizePoolBar current={currentAmount} goal={goalAmount} />
              )}
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-emerald-500/10 bg-slate-900/70 px-4 py-3"
                  >
                    <div className="text-xs uppercase tracking-wider text-emerald-200/50">
                      {stat.label}
                    </div>
                    <div className="mt-2 text-lg font-semibold text-emerald-100">
                      {stat.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-emerald-100">Paliers débloquables</h2>
              <UnlockableTiers tiers={tiers} currentAmount={currentAmount} />
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-emerald-100">Contributeurs</h2>
                <span className="text-xs text-emerald-200/60">Dernières contributions</span>
              </div>
              {loading ? (
                <div className="text-sm text-emerald-200/60">Chargement des contributions...</div>
              ) : (
                <ContributorList items={data?.contributors ?? []} />
              )}
            </section>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-emerald-500/20 bg-slate-950/70 p-6">
              <h2 className="text-xl font-semibold text-emerald-100">Participer</h2>
              <p className="mt-2 text-sm text-emerald-200/70">
                Paiement Stripe simulé pour le MVP. Votre contribution sera visible immédiatement.
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="text-xs uppercase tracking-wider text-emerald-200/60">Pseudo</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    disabled={anonymous}
                    placeholder="CyberRunner"
                    className="mt-2 w-full rounded-xl border border-emerald-500/30 bg-slate-950 px-4 py-2 text-sm text-emerald-100 placeholder:text-emerald-200/40 focus:border-emerald-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs uppercase tracking-wider text-emerald-200/60">Montant (€)</label>
                  <input
                    type="number"
                    min={5}
                    step={5}
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-emerald-500/30 bg-slate-950 px-4 py-2 text-sm text-emerald-100 focus:border-emerald-400 focus:outline-none"
                  />
                </div>

                <label className="flex items-center gap-2 text-xs text-emerald-200/70">
                  <input
                    type="checkbox"
                    checked={anonymous}
                    onChange={(event) => setAnonymous(event.target.checked)}
                    className="h-4 w-4 rounded border-emerald-500/40 bg-slate-950 text-emerald-400 focus:ring-emerald-400"
                  />
                  Contribuer anonymement
                </label>

                {error ? (
                  <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs text-red-200">
                    {error}
                  </div>
                ) : null}
                {success ? (
                  <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-200">
                    {success}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? 'Traitement...' : 'Procéder au checkout Stripe'}
                </button>
              </form>
            </div>

            <div className="rounded-3xl border border-emerald-500/20 bg-slate-950/70 p-6 text-sm text-emerald-200/70">
              <h3 className="text-base font-semibold text-emerald-100">Pourquoi contribuer ?</h3>
              <ul className="mt-4 space-y-2">
                <li>• Financer des productions live plus ambitieuses.</li>
                <li>• Débloquer des récompenses pour les joueurs.</li>
                <li>• Renforcer la visibilité de la scène NB Esport.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
