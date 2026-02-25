import { useEffect } from "react";
import { useLocation } from "wouter";

export default function ClaimsGovernanceIndex() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation("/claims-governance/rule-studio");
  }, [setLocation]);

  return null;
}
