import { useState, useEffect } from "react";

const PERSONA_STORAGE_KEY = "chi-portal-persona";

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

export function usePersona(pillar: "intelligence" | "business" | "members") {
  const [code, setCode] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(PERSONA_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed[pillar] || defaults[pillar];
      }
    } catch {}
    return defaults[pillar];
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(PERSONA_STORAGE_KEY);
      const current = stored ? JSON.parse(stored) : { ...defaults };
      current[pillar] = code;
      localStorage.setItem(PERSONA_STORAGE_KEY, JSON.stringify(current));
    } catch {}
  }, [code, pillar]);

  return [code, setCode] as const;
}
