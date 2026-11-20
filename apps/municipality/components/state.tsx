'use client';

import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useState,
  type ReactNode,
} from 'react';
import { execute, type Command } from '../domain/commands';
import { restoreDemo, seed, users } from '../domain/data';
import type { Role, State } from '../domain/types';

const storageKey = 'hamsade-demo-v3';
const priorStorageKey = 'hamsade-demo-v2';
type Session = {
  data: State;
  role: Role | null;
  simple: boolean;
  name: string;
  ready: boolean;
  message?: { text: string; error: boolean; id: string };
};
type DemoEvent =
  | { type: 'hydrate'; snapshot: Session }
  | { type: 'switch'; role: Role | null }
  | { type: 'simple' }
  | { type: 'reset' }
  | { type: 'name'; name: string }
  | { type: 'command'; command: Command; now: string; id: string };
const initial = (): Session => ({
  data: seed(),
  role: null,
  simple: false,
  name: '',
  ready: false,
});

function reducer(session: Session, event: DemoEvent): Session {
  switch (event.type) {
    case 'hydrate':
      return { ...event.snapshot, ready: true };
    case 'switch':
      return { ...session, role: event.role, name: '', message: undefined };
    case 'simple':
      return { ...session, simple: !session.simple };
    case 'reset':
      return { ...initial(), ready: true };
    case 'name':
      return { ...session, name: event.name.trim().slice(0, 60) };
    case 'command': {
      const user = users.find((item) => item.id === session.role);
      if (!user) return session;
      const result = execute(session.data, user, event.command, event.now);
      return {
        ...session,
        data: result.state,
        message: { text: result.message, error: !!result.error, id: event.id },
      };
    }
  }
}

const Demo = createContext<{
  session: Session;
  dispatch: React.Dispatch<DemoEvent>;
} | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [session, dispatch] = useReducer(reducer, undefined, initial);
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    let snapshot = initial();
    try {
      const current = localStorage.getItem(storageKey);
      const stored = current ?? localStorage.getItem(priorStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as Session;
        if (
          Array.isArray(parsed.data?.cases) &&
          Array.isArray(parsed.data?.disabled)
        )
          snapshot = current
            ? parsed
            : { ...parsed, data: restoreDemo(parsed.data) };
      }
    } catch {
      /* A corrupt or unavailable snapshot falls back to fixtures. */
    }
    dispatch({ type: 'hydrate', snapshot });
  }, []);
  useEffect(() => {
    if (!session.ready) return;
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ ...session, message: undefined }),
      );
      localStorage.removeItem(priorStorageKey);
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [session]);
  return (
    <Demo.Provider value={{ session, dispatch }}>
      {children}
      {storageError && (
        <p role="alert" className="storage-alert">
          ذخیره در مرورگر ممکن نیست. تغییرات فعلی ممکن است پس از تازه‌سازی از
          بین برود.
        </p>
      )}
    </Demo.Provider>
  );
}

export function useDemo() {
  const context = useContext(Demo);
  if (!context) throw new Error('Missing municipality demo provider');
  const { session, dispatch } = context;
  const user = users.find(
    (item) =>
      item.id === session.role && !session.data.disabled.includes(item.id),
  );
  return {
    ...context,
    user,
    state: session.data,
    send: (command: Command) =>
      dispatch({
        type: 'command',
        command,
        now: new Date().toISOString(),
        id: crypto.randomUUID(),
      }),
  };
}
