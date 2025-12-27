"use client";

import { useEffect } from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import type { LoginState } from "./actions";
import { login } from "./actions";

const initialState: LoginState = {};

export default function AdminLoginForm() {
  const router = useRouter();
  const [state, formAction] = useFormState<LoginState, FormData>(login, initialState);

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="text-sm text-slate-300">Mot de passe</label>
        <input
          type="password"
          name="password"
          className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-2 text-sm text-white"
          required
        />
      </div>
      {state.error ? <p className="text-sm text-rose-300">{state.error}</p> : null}
      <button
        type="submit"
        className="inline-flex items-center justify-center rounded-full bg-emerald-400/90 px-5 py-2 text-sm font-semibold text-slate-900 transition hover:bg-emerald-300"
      >
        Accéder
      </button>
    </form>
  );
}
