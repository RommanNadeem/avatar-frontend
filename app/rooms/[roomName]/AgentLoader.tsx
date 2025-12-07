"use client";

import * as React from "react";
import Image from "next/image";

interface AgentLoaderProps {
  personaName?: string;
  personaImage?: string;
}

export function AgentLoader({ personaName, personaImage }: AgentLoaderProps) {
  return (
    <>
      <style>{`
        @keyframes agentLoaderSpin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
        .agent-loader-spinner {
          animation: agentLoaderSpin 1s linear infinite;
        }
        .agent-placeholder-pulse {
          animation: pulse 2s ease-in-out infinite;
        }
      `}</style>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "var(--lk-bg, #ffffff)",
          zIndex: 10,
        }}
      >
        <div
          style={{
            textAlign: "center",
            color: "var(--lk-text, #1a1a1a)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "2rem",
          }}
        >
          {/* Persona Image Placeholder */}
          <div
            className="agent-placeholder-pulse"
            style={{
              width: "300px",
              height: "300px",
              borderRadius: "50%",
              overflow: "hidden",
              position: "relative",
              border: "4px solid var(--lk-border, #e0e0e0)",
              backgroundColor: "var(--lk-bg-secondary, #f5f5f5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {personaImage ? (
              <Image
                src={personaImage}
                alt={personaName || "Agent"}
                width={300}
                height={300}
                style={{
                  objectFit: "cover",
                  width: "100%",
                  height: "100%",
                }}
              />
            ) : (
              <div
                style={{
                  fontSize: "6rem",
                  fontWeight: "bold",
                  color: "var(--lk-text-secondary, #999)",
                }}
              >
                {personaName?.charAt(0) || "A"}
              </div>
            )}
            {/* Loading overlay */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(255, 255, 255, 0.7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                className="agent-loader-spinner"
                style={{
                  width: "40px",
                  height: "40px",
                  border: "3px solid var(--lk-border, #e0e0e0)",
                  borderTop: "3px solid var(--lk-accent, #4a9eff)",
                  borderRadius: "50%",
                }}
              />
            </div>
          </div>

          {/* Text Content */}
          <div>
            <h2
              style={{
                fontSize: "1.5rem",
                fontWeight: "600",
                marginBottom: "0.5rem",
                color: "var(--lk-text, #1a1a1a)",
              }}
            >
              {personaName ? `${personaName} is joining...` : "AI Agent is joining..."}
            </h2>
            <p
              style={{
                fontSize: "1rem",
                color: "var(--lk-text-secondary, #666)",
              }}
            >
              Please wait while we connect
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

