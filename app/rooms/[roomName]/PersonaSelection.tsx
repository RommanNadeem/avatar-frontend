"use client";

import React from "react";
import Image from "next/image";

export interface Persona {
  id: string;
  name: string;
  image?: string;
  description?: string;
}

const PERSONAS: Persona[] = [
  {
    id: "2fbdec6f-86fd-47d6-8bcc-e8a69270e75b",
    name: "Pablo",
    description: "Friendly and professional",
  },
  {
    id: "30fa96d0-26c4-4e55-94a0-517025942e18",
    name: "Cara",
    description: "Warm and approachable",
  },
  {
    id: "aa5d6abd-416f-4dd4-a123-b5b29bf1644a",
    name: "Leo",
    description: "Energetic and engaging",
  },
];

interface PersonaSelectionProps {
  onSelect: (persona: Persona) => void;
  onSkip?: () => void;
}

export function PersonaSelection({ onSelect, onSkip }: PersonaSelectionProps) {
  const [selectedPersona, setSelectedPersona] = React.useState<Persona | null>(null);

  const handleContinue = () => {
    if (selectedPersona) {
      onSelect(selectedPersona);
    }
  };

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--lk-bg, #1a1a1a)",
        color: "var(--lk-text, #ffffff)",
        padding: "2rem",
      }}
    >
      <div style={{ maxWidth: "800px", width: "100%", textAlign: "center" }}>
        <h1
          style={{
            fontSize: "2rem",
            fontWeight: "600",
            marginBottom: "0.5rem",
          }}
        >
          Select Your AI Avatar
        </h1>
        <p
          style={{
            fontSize: "1rem",
            color: "var(--lk-text-secondary, #999)",
            marginBottom: "2rem",
          }}
        >
          Choose an AI persona to interact with during the meeting
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1.5rem",
            marginBottom: "2rem",
          }}
        >
          {PERSONAS.map((persona) => (
            <div
              key={persona.id}
              onClick={() => setSelectedPersona(persona)}
              style={{
                padding: "1.5rem",
                borderRadius: "12px",
                border: `2px solid ${
                  selectedPersona?.id === persona.id
                    ? "var(--lk-accent, #4a9eff)"
                    : "var(--lk-border, #333)"
                }`,
                backgroundColor:
                  selectedPersona?.id === persona.id
                    ? "var(--lk-accent-alpha, rgba(74, 158, 255, 0.1))"
                    : "var(--lk-bg-secondary, #252525)",
                cursor: "pointer",
                transition: "all 0.2s",
                transform:
                  selectedPersona?.id === persona.id ? "scale(1.05)" : "scale(1)",
              }}
              onMouseEnter={(e) => {
                if (selectedPersona?.id !== persona.id) {
                  e.currentTarget.style.borderColor = "var(--lk-accent, #4a9eff)";
                  e.currentTarget.style.opacity = "0.8";
                }
              }}
              onMouseLeave={(e) => {
                if (selectedPersona?.id !== persona.id) {
                  e.currentTarget.style.borderColor = "var(--lk-border, #333)";
                  e.currentTarget.style.opacity = "1";
                }
              }}
            >
              <div
                style={{
                  width: "120px",
                  height: "120px",
                  margin: "0 auto 1rem",
                  borderRadius: "50%",
                  backgroundColor: "var(--lk-bg-tertiary, #333)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "3rem",
                  fontWeight: "bold",
                  color: "var(--lk-text, #fff)",
                }}
              >
                {persona.name.charAt(0)}
              </div>
              <h3
                style={{
                  fontSize: "1.25rem",
                  fontWeight: "600",
                  marginBottom: "0.5rem",
                }}
              >
                {persona.name}
              </h3>
              {persona.description && (
                <p
                  style={{
                    fontSize: "0.875rem",
                    color: "var(--lk-text-secondary, #999)",
                  }}
                >
                  {persona.description}
                </p>
              )}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
          {onSkip && (
            <button
              onClick={onSkip}
              style={{
                padding: "0.75rem 2rem",
                borderRadius: "8px",
                border: "1px solid var(--lk-border, #333)",
                backgroundColor: "transparent",
                color: "var(--lk-text, #fff)",
                cursor: "pointer",
                fontSize: "1rem",
                fontWeight: "500",
              }}
            >
              Skip
            </button>
          )}
          <button
            onClick={handleContinue}
            disabled={!selectedPersona}
            style={{
              padding: "0.75rem 2rem",
              borderRadius: "8px",
              border: "none",
              backgroundColor: selectedPersona
                ? "var(--lk-accent, #4a9eff)"
                : "var(--lk-bg-tertiary, #333)",
              color: "var(--lk-text, #fff)",
              cursor: selectedPersona ? "pointer" : "not-allowed",
              fontSize: "1rem",
              fontWeight: "500",
              opacity: selectedPersona ? 1 : 0.5,
            }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

export { PERSONAS };

