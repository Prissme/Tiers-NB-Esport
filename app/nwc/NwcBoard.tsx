"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import {
  curMatches,
  nameOf,
  QUAL_LOSSES,
  QUAL_WINS,
  recordsOf,
  roundsOf,
  SWISS_ROUNDS,
  sortTeams,
  tagFor,
  TOP,
  totalRounds,
  type NwcMatch,
  type NwcState,
  type Phase,
} from "../../src/lib/nwc/swiss";

const CYAN = "#22e4ff";
const GREY = "#9aa6ad";
const PINK = "#ff5d73";
const RED = "#ff3b5c";

const groupColor = (w: number, l: number) => (w > l ? CYAN : w === l ? GREY : PINK);
const placeLabel = (w: number) => (w >= 3 ? "1RE" : w === 2 ? "2E–4E" : w === 1 ? "5E–7E" : "8E");
const rowKey = (r: number, i: number, tid: number) => `${r}-${i}-${tid}`;

type PathLink = { key: string; tid: number; won: boolean; d: string };

/** Position d'un élément dans le graphe, sans tenir compte des transformations (hover). */
const posIn = (el: HTMLElement, board: HTMLElement) => {
  let x = 0;
  let y = 0;
  let node: HTMLElement | null = el;
  while (node && node !== board) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
};

function Chip({ label, value, accent }: { label: string; value: string; accent?: "q" | "e" }) {
  const color = accent === "q" ? CYAN : accent === "e" ? RED : undefined;
  return (
    <div
      className="border-[1.5px] bg-[#0f1b23] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[.15em] text-[#7a8a94]"
      style={{ borderColor: color ?? "#1d2b33" }}
    >
      {label}
      <b className="ml-1.5 text-[13px]" style={{ color: color ?? "#fff" }}>
        {value}
      </b>
    </div>
  );
}

function ColHead({ title, status, current }: { title: string; status: string; current?: boolean }) {
  return (
    <div
      className="mb-3.5 flex items-baseline justify-between border-b-2 pb-2 text-sm font-black tracking-[.25em]"
      style={{ borderColor: CYAN, color: CYAN }}
    >
      <span>{title}</span>
      <small
        className="text-[10px] font-extrabold tracking-[.18em]"
        style={{ color: current ? CYAN : "#5d6b74" }}
      >
        {status}
      </small>
    </div>
  );
}

export default function NwcBoard({ initialState }: { initialState: NwcState }) {
  const [state, setState] = useState<NwcState>(initialState);
  const [view, setView] = useState<Phase>(initialState.phase);
  const [hover, setHover] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);
  const [geo, setGeo] = useState<{ w: number; h: number; links: PathLink[] }>({ w: 0, h: 0, links: [] });
  const [tick, setTick] = useState(0);
  const boardRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef(new Map<string, HTMLElement>());

  // Suit la phase en cours dès qu'elle change côté admin
  useEffect(() => {
    setView(state.phase);
  }, [state.phase]);

  // Rafraîchissement périodique depuis le serveur
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const res = await fetch("/api/site/nwc", { cache: "no-store" });
        if (!res.ok) return;
        const body = (await res.json()) as { state?: NwcState };
        if (alive && body.state) setState(body.state);
      } catch {
        // réseau indisponible : on garde le dernier état affiché
      }
    };
    const id = window.setInterval(tick, 15000);
    const onResize = () => setTick((n) => n + 1);
    window.addEventListener("resize", onResize);
    return () => {
      alive = false;
      window.clearInterval(id);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  // Trace les liens entre rounds une fois le DOM posé
  useLayoutEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const rs = roundsOf(state, view);
    const links: PathLink[] = [];
    for (let r = 0; r < rs.length - 1; r++) {
      (rs[r + 1] ?? []).forEach((m2, j) => {
        [m2.a, m2.b].forEach((tid) => {
          if (tid === null) return;
          const i1 = rs[r].findIndex((m) => m.a === tid || m.b === tid);
          if (i1 < 0) return;
          const e1 = rowRefs.current.get(rowKey(r, i1, tid));
          const e2 = rowRefs.current.get(rowKey(r + 1, j, tid));
          if (!e1 || !e2) return;
          const p1 = posIn(e1, board);
          const p2 = posIn(e2, board);
          const x1 = p1.x + p1.w;
          const y1 = p1.y + p1.h / 2;
          const x2 = p2.x;
          const y2 = p2.y + p2.h / 2;
          const mx = (x1 + x2) / 2;
          links.push({
            key: `${r}-${tid}`,
            tid,
            won: rs[r][i1].w === tid,
            d: `M${x1} ${y1} C${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`,
          });
        });
      });
    }
    setGeo({ w: board.scrollWidth, h: board.scrollHeight, links });
  }, [state, view, tick]);

  if (state.teams.length === 0) {
    return <p className="text-sm text-white/60">Aucun tournoi en cours pour le moment.</p>;
  }

  const focus = pinned ?? hover;
  const togglePin = (tid: number) => setPinned((p) => (p === tid ? null : tid));

  const rs = roundsOf(state, view);
  const total = Math.max(totalRounds(view), rs.length);
  const rec = recordsOf(state, view);
  const isLivePhase = view === state.phase;
  const cur = curMatches(state);
  const doneCount = cur.filter((m) => m.done).length;
  const qualCount = state.teams.filter((t) => tagFor(state, t).cls === "Q").length;
  const elimCount = state.teams.filter((t) => tagFor(state, t).cls === "E").length;

  const teamRow = (
    r: number,
    i: number,
    tid: number,
    recTuple: [number, number] | null,
    won: boolean,
    lost: boolean
  ) => {
    const active = focus === tid;
    const dim = focus !== null && !active;
    return (
      <div
        key={`${i}-${tid}`}
        ref={(el) => {
          const k = rowKey(r, i, tid);
          if (el) rowRefs.current.set(k, el);
          else rowRefs.current.delete(k);
        }}
        onMouseEnter={() => setHover(tid)}
        onMouseLeave={() => setHover(null)}
        onClick={() => togglePin(tid)}
        title={nameOf(state, tid)}
        className="flex cursor-pointer items-center gap-2 border-t border-[#1d2b33] py-2 pl-3.5 pr-2.5 text-sm font-bold transition-opacity"
        style={{
          opacity: dim ? 0.3 : lost ? 0.55 : 1,
          color: won || active ? "#fff" : lost ? "#4f5d66" : undefined,
          background: active
            ? "rgba(34,228,255,.18)"
            : won
            ? "linear-gradient(90deg, rgba(34,228,255,.22), transparent 85%)"
            : undefined,
        }}
      >
        <span className="flex-1 truncate">{nameOf(state, tid)}</span>
        <span className="text-[10px] font-semibold text-[#7a8a94]">
          {recTuple ? `(${recTuple[0]}-${recTuple[1]})` : "BYE"}
        </span>
      </div>
    );
  };

  const matchBox = (r: number, i: number, m: NwcMatch, live: boolean, color: string) => (
    <div key={i} className="relative mb-3 border bg-[#0a1218]" style={{ borderColor: color }}>
      <div
        className="flex items-center justify-between px-3.5 pb-1 pt-1 text-[9px] font-extrabold tracking-[.22em]"
        style={{ color }}
      >
        <span>MATCH {i + 1}</span>
        {live && !m.done ? <span>● LIVE</span> : null}
      </div>
      {teamRow(r, i, m.a, m.ra, m.done && m.w === m.a, m.done && m.b !== null && m.w !== m.a)}
      {m.b !== null
        ? teamRow(r, i, m.b, m.rb, m.done && m.w === m.b, m.done && m.w !== m.b)
        : null}
    </div>
  );

  const renderRound = (r: number) => {
    const ms = rs[r];
    if (!ms || !ms.length) {
      return (
        <div key={`empty-${r}`} className="w-[250px] flex-none">
          <ColHead title={`ROUND ${r + 1}`} status="À VENIR" />
          <div className="border border-dashed border-[#1d2b33] py-10 text-center text-[11px] font-extrabold tracking-[.25em] text-[#33424b]">
            —
          </div>
        </div>
      );
    }
    const current = isLivePhase && r === state.round - 1;
    const doneN = ms.filter((m) => m.done).length;
    const status =
      current && doneN < ms.length ? `EN COURS ${doneN}/${ms.length}` : `${ms.length} MATCH${ms.length > 1 ? "S" : ""}`;

    const groups = new Map<string, Array<{ m: NwcMatch; i: number }>>();
    ms.forEach((m, i) => {
      const k = m.ra.join("-");
      groups.set(k, [...(groups.get(k) ?? []), { m, i }]);
    });
    const keys = [...groups.keys()].sort((x, y) => {
      const [aw, al] = x.split("-").map(Number);
      const [bw, bl] = y.split("-").map(Number);
      return bw - aw || al - bl;
    });

    return (
      <div key={`round-${r}`} className="w-[250px] flex-none">
        <ColHead title={`ROUND ${r + 1}`} status={status} current={current} />
        {keys.map((k) => {
          const [w, l] = k.split("-").map(Number);
          const color = groupColor(w, l);
          const items = groups.get(k) ?? [];
          return (
            <div key={k} className="mb-5 border-t-2 pt-2.5" style={{ borderColor: color }}>
              <div className="mb-2.5 flex items-center gap-2.5">
                <span className="border px-2 text-[13px] font-black" style={{ color, borderColor: color }}>
                  {k}
                </span>
                <span className="text-[10px] font-extrabold tracking-[.2em] text-[#7a8a94]">
                  {items.length} MATCH{items.length > 1 ? "S" : ""}
                </span>
              </div>
              {items.map(({ m, i }) => matchBox(r, i, m, current, color))}
            </div>
          );
        })}
      </div>
    );
  };

  const renderResults = () => {
    const ids = Object.keys(rec).map(Number);
    const entry = (tid: number, cls: "q" | "e" | "n", left: string, right: string) => (
      <div
        key={`${cls}-${tid}`}
        className="mb-2 flex items-center gap-2 border-[1.5px] bg-[#0a1218] px-3 py-2 text-sm font-bold"
        style={{ borderColor: cls === "q" ? CYAN : cls === "e" ? RED : "#2c4350" }}
        title={nameOf(state, tid)}
      >
        {left ? <span className="min-w-[42px] text-[10px] font-black tracking-widest text-[#22e4ff]">{left}</span> : null}
        <span className="flex-1 truncate">{nameOf(state, tid)}</span>
        <span className="text-[11px] font-extrabold text-[#7a8a94]">{right}</span>
      </div>
    );
    const placeholder = (key: string) => (
      <div
        key={key}
        className="mb-2 border-[1.5px] border-dashed border-[#1d2b33] py-2.5 text-center text-[10px] font-extrabold tracking-[.22em] text-[#33424b]"
      >
        À VENIR
      </div>
    );
    const title = (txt: string, color: string, right?: string) => (
      <div className="mb-2.5 mt-4 flex justify-between text-[11px] font-black tracking-[.22em]" style={{ color }}>
        <span>{txt}</span>
        {right ? <span>{right}</span> : null}
      </div>
    );

    let body: ReactNode;
    if (view === 1) {
      const q = ids
        .filter((id) => rec[id].w >= QUAL_WINS)
        .sort((a, b) => rec[a].l - rec[b].l || rec[b].w - rec[a].w);
      const e = ids
        .filter((id) => rec[id].l >= QUAL_LOSSES)
        .sort((a, b) => rec[b].w - rec[a].w || rec[a].l - rec[b].l);
      const expElim = Math.max(0, state.teams.length - TOP);
      body = (
        <>
          {title("QUALIFIÉS", CYAN, `${q.length}/${TOP}`)}
          {q.map((id) => entry(id, "q", "", `${rec[id].w}-${rec[id].l}`))}
          {Array.from({ length: Math.max(0, TOP - q.length) }, (_, k) => placeholder(`pq-${k}`))}
          {expElim > 0 ? (
            <>
              {title("ÉLIMINÉS", RED, `${e.length}/${expElim}`)}
              {e.map((id) => entry(id, "e", "", `${rec[id].w}-${rec[id].l}`))}
              {Array.from({ length: Math.max(0, expElim - e.length) }, (_, k) => placeholder(`pe-${k}`))}
            </>
          ) : null}
        </>
      );
    } else {
      const fin = rs.length >= SWISS_ROUNDS && (rs[SWISS_ROUNDS - 1] ?? []).every((m) => m.done);
      const sorted = [...ids].sort((a, b) => rec[b].w - rec[a].w || rec[a].l - rec[b].l);
      body = (
        <>
          {title(fin ? "CLASSEMENT FINAL" : "CLASSEMENT LIVE", GREY)}
          {sorted.map((id) => {
            const cls = fin ? (rec[id].w >= 2 ? "q" : rec[id].w === 0 ? "e" : "n") : "n";
            return entry(id, cls, fin ? placeLabel(rec[id].w) : "", `${rec[id].w}-${rec[id].l}`);
          })}
        </>
      );
    }

    return (
      <div className="w-[250px] flex-none">
        <ColHead title="RÉSULTATS" status={`PHASE ${view}`} />
        {body}
      </div>
    );
  };

  const standings = sortTeams(state);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-2">
        <Chip label="Phase" value={String(state.phase)} />
        <Chip label="Round" value={`${state.round}/${totalRounds(state.phase)}`} />
        <Chip label="Matchs joués" value={`${doneCount}/${cur.length}`} />
        {state.phase === 1 ? <Chip label="Qualifiés" value={`${qualCount}/${TOP}`} accent="q" /> : null}
        {state.phase === 1 ? <Chip label="Éliminés" value={String(elimCount)} accent="e" /> : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {([1, 2] as Phase[]).map((v) => {
          const disabled = v === 2 && roundsOf(state, 2).length === 0;
          const active = view === v;
          return (
            <button
              key={v}
              type="button"
              disabled={disabled}
              onClick={() => setView(v)}
              className="border px-4 py-2 text-xs font-extrabold uppercase tracking-[.08em] transition-opacity disabled:opacity-30"
              style={{
                borderColor: active ? CYAN : "#2c4350",
                color: active ? CYAN : "#ececf2",
                background: active ? "rgba(34,228,255,.08)" : "transparent",
              }}
            >
              {v === 1 ? "Phase 1 · Qualifiers" : "Phase 2 · Swiss top 8"}
            </button>
          );
        })}
      </div>

      <div className="overflow-x-auto pb-2">
        <div ref={boardRef} className="relative flex min-w-max gap-12 px-1 pb-4 pt-1">
          <svg
            className="pointer-events-none absolute left-0 top-0 z-0 overflow-visible"
            width={geo.w}
            height={geo.h}
          >
            {geo.links.map((l) => (
              <path
                key={l.key}
                d={l.d}
                fill="none"
                stroke={l.won ? CYAN : "#5d6b74"}
                strokeWidth={l.won ? 2 : 1.5}
                strokeDasharray={l.won ? undefined : "5 5"}
                opacity={focus !== null ? (l.tid === focus ? 1 : 0.06) : l.won ? 0.8 : 0.9}
              />
            ))}
          </svg>
          {Array.from({ length: total }, (_, r) => renderRound(r))}
          {renderResults()}
        </div>
      </div>

      <p className="text-xs text-white/50">
        Survole une équipe pour suivre son parcours, clique pour l'épingler.
        {pinned !== null ? ` 📌 ${nameOf(state, pinned)} épinglée (clic pour retirer).` : ""}
      </p>

      <div className="overflow-x-auto">
        <table className="surface-table w-full text-sm text-white/80">
          <thead className="surface-table__header text-xs uppercase text-white/40">
            <tr>
              <th className="px-3 py-2 text-left">#</th>
              <th className="px-3 py-2 text-left">Équipe</th>
              <th className="px-3 py-2 text-left">W-L</th>
              <th className="px-3 py-2 text-left">Statut</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((t, i) => {
              const tag = tagFor(state, t);
              const color = tag.cls === "Q" ? CYAN : tag.cls === "E" ? RED : "#c9c9d6";
              return (
                <tr key={t.id} className="surface-table__row">
                  <td className="px-3 py-2">{i + 1}</td>
                  <td className="px-3 py-2 text-white/90">{t.name}</td>
                  <td className="px-3 py-2">
                    {t.w}-{t.l}
                  </td>
                  <td className="px-3 py-2 text-xs font-black uppercase tracking-wider" style={{ color }}>
                    {tag.label}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {state.phase === 1 ? (
          <p className="mt-3 text-xs text-white/40">
            Phase 1 : qualifié à {QUAL_WINS} victoires, éliminé à {QUAL_LOSSES} défaites. Phase 2 (Swiss, {TOP} équipes,{" "}
            {SWISS_ROUNDS} rounds) : 3-0 = 1re, 2-1 = 2e à 4e, 1-2 = 5e à 7e, 0-3 = 8e.
          </p>
        ) : null}
      </div>
    </div>
  );
}
