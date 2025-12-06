import { createContext, useContext } from "react";
import { Persona } from "./PersonaSelection";

export const PersonaContext = createContext<{
  selectedPersona: Persona | null;
  setSelectedPersona: (persona: Persona | null) => void;
}>({
  selectedPersona: null,
  setSelectedPersona: () => {},
});

export const usePersona = () => useContext(PersonaContext);

