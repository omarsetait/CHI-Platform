import { useState, useEffect, useCallback } from "react";

const PERSONA_STORAGE_KEY = "chi-portal-persona";
const PERSONA_CHANGE_EVENT = "chi-persona-change";

interface PersonaState {
  intelligence: string;
  business: string;
  members: string;
}

const defaults: PersonaState = {
  intelligence: "PRV-001",
  business: "EMP-001",
  members: "MEM-001",
};

function readFromStorage(pillar: keyof PersonaState): string {
  try {
    const stored = localStorage.getItem(PERSONA_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed[pillar] || defaults[pillar];
    }
  } catch {}
  return defaults[pillar];
}

function writeToStorage(pillar: keyof PersonaState, code: string) {
  try {
    const stored = localStorage.getItem(PERSONA_STORAGE_KEY);
    const current = stored ? JSON.parse(stored) : { ...defaults };
    current[pillar] = code;
    localStorage.setItem(PERSONA_STORAGE_KEY, JSON.stringify(current));
  } catch {}
}

export function usePersona(pillar: "intelligence" | "business" | "members") {
  const [code, setCodeInternal] = useState<string>(() => readFromStorage(pillar));

  const setCode = useCallback(
    (newCode: string) => {
      setCodeInternal(newCode);
      writeToStorage(pillar, newCode);
      window.dispatchEvent(
        new CustomEvent(PERSONA_CHANGE_EVENT, {
          detail: { pillar, code: newCode },
        }),
      );
    },
    [pillar],
  );

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail.pillar === pillar) {
        setCodeInternal(detail.code);
      }
    };
    window.addEventListener(PERSONA_CHANGE_EVENT, handler);
    return () => window.removeEventListener(PERSONA_CHANGE_EVENT, handler);
  }, [pillar]);

  return [code, setCode] as const;
}
