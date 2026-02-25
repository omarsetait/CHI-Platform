import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Adjudication() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation("/claims-governance/adjudication/dashboard");
  }, [setLocation]);

  return null;
}
