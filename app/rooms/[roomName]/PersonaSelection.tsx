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
    id: "6cc28442-cccd-42a8-b6e4-24b7210a09c5",
    name: "Shehzad",
    image: "/images/Shehzad.png",
    description: "Medical Affair Trainer",
  },
  {
    id: "edf6fdcb-acab-44b8-b974-ded72665ee26",
    name: "Amna",
    image: "/images/Amna.png",
    description: "HR Trainer",
  },
  {
    id: "8a339c9f-0666-46bd-ab27-e90acd0409dc",
    name: "Ahmad",
    image: "/images/Ahmad.png",
    description: "Marketing Trainer",
  },
];

interface PersonaSelectionProps {
  onSelect: (persona: Persona) => void;
  onSkip?: () => void;
}

export function PersonaSelection({ onSelect, onSkip }: PersonaSelectionProps) {
  const [selectedPersona, setSelectedPersona] = React.useState<Persona | null>(null);

  const handlePersonaClick = (persona: Persona) => {
    setSelectedPersona(persona);
    onSelect(persona);
  };

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--lk-bg, #ffffff)",
        color: "var(--lk-text, #1a1a1a)",
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
              onClick={() => handlePersonaClick(persona)}
              style={{
                padding: "1.5rem",
                borderRadius: "12px",
                border: `2px solid ${
                  selectedPersona?.id === persona.id
                    ? "var(--lk-accent, #4a9eff)"
                    : "var(--lk-border, #e0e0e0)"
                }`,
                    backgroundColor:
                  selectedPersona?.id === persona.id
                    ? "var(--lk-accent-alpha, rgba(74, 158, 255, 0.1))"
                    : "var(--lk-bg-secondary, #f5f5f5)",
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
                  e.currentTarget.style.borderColor = "var(--lk-border, #e0e0e0)";
                  e.currentTarget.style.opacity = "1";
                }
              }}
            >
              {persona.image ? (
                <div
                  style={{
                    width: "120px",
                    height: "120px",
                    margin: "0 auto 1rem",
                    borderRadius: "50%",
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  <Image
                    src={persona.image}
                    alt={persona.name}
                    width={120}
                    height={120}
                    style={{
                      objectFit: "cover",
                      width: "100%",
                      height: "100%",
                    }}
                  />
                </div>
              ) : (
                <div
                  style={{
                    width: "120px",
                    height: "120px",
                    margin: "0 auto 1rem",
                    borderRadius: "50%",
                    backgroundColor: "var(--lk-bg-tertiary, #e5e5e5)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "3rem",
                    fontWeight: "bold",
                    color: "var(--lk-text, #1a1a1a)",
                  }}
                >
                  {persona.name.charAt(0)}
                </div>
              )}
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
      </div>
    </div>
  );
}

export { PERSONAS };

