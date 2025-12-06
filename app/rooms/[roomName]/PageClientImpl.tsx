"use client";

import { decodePassphrase } from "@/lib/client-utils";
import { DebugMode } from "@/lib/Debug";
import { RecordingIndicator } from "@/lib/RecordingIndicator";
import { SettingsMenu } from "@/lib/SettingsMenu";
import { ConnectionDetails } from "@/lib/types";
import {
  formatChatMessageLinks,
  LiveKitRoom,
  LocalUserChoices,
  // PreJoin,
  // VideoConference,
} from "@livekit/components-react";
import {
  ExternalE2EEKeyProvider,
  RoomOptions,
  VideoCodec,
  VideoPresets,
  Room,
  DeviceUnsupportedError,
  RoomConnectOptions,
} from "livekit-client";
import { useRouter } from "next/navigation";
import React from "react";
import { RoomContext } from "./RoomContext";
import { VideoConference } from "./VideoConference";
import { PersonaSelection, Persona } from "./PersonaSelection";
import { PersonaContext } from "./PersonaContext";
// PreJoin removed - auto-join enabled

const CONN_DETAILS_ENDPOINT =
  process.env.NEXT_PUBLIC_CONN_DETAILS_ENDPOINT ??
  "/api/livekit/connection-details";
const SHOW_SETTINGS_MENU = process.env.NEXT_PUBLIC_SHOW_SETTINGS_MENU == "true";

export function PageClientImpl(props: {
  roomName: string;
  region?: string;
  hq: boolean;
  codec: VideoCodec;
}) {
  // Auto-join: Generate username and default settings
  const [userChoices] = React.useState<LocalUserChoices>(() => ({
    username: `User-${Math.random().toString(36).substring(2, 9)}`,
    videoEnabled: true,
    audioEnabled: true,
    videoDeviceId: undefined,
    audioDeviceId: undefined,
  }));

  const [connectionDetails, setConnectionDetails] = React.useState<
    ConnectionDetails | undefined
  >(undefined);
  const [isConnecting, setIsConnecting] = React.useState(false);
  const [selectedPersona, setSelectedPersona] = React.useState<Persona | null>(null);
  const [showPersonaSelection, setShowPersonaSelection] = React.useState(true);

  // Handle persona selection
  const handlePersonaSelect = React.useCallback((persona: Persona) => {
    setSelectedPersona(persona);
    setShowPersonaSelection(false);
    // Start connecting after persona is selected
    setIsConnecting(true);
  }, []);

  const handleSkipPersona = React.useCallback(() => {
    setShowPersonaSelection(false);
    setIsConnecting(true);
  }, []);

  // Connect to room after persona selection (or skip)
  React.useEffect(() => {
    if (!showPersonaSelection && isConnecting && !connectionDetails) {
      const connect = async () => {
        try {
          const url = new URL(CONN_DETAILS_ENDPOINT, window.location.origin);
          url.searchParams.append("roomName", props.roomName);
          url.searchParams.append("participantName", userChoices.username);
          
          // Add persona metadata to the token request
          if (selectedPersona) {
            url.searchParams.append("avatarId", selectedPersona.id);
            url.searchParams.append("personaName", selectedPersona.name);
            console.log("📋 Sending persona to token API:", selectedPersona.name, selectedPersona.id);
          }
          
          if (props.region) {
            url.searchParams.append("region", props.region);
          }

          const response = await fetch(url.toString());
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || `Failed to connect: ${response.status}`);
          }

          const data = await response.json();
          setConnectionDetails(data);
          setIsConnecting(false);
          console.log("✅ Auto-joined room:", props.roomName);
          if (selectedPersona) {
            console.log("✅ Selected persona:", selectedPersona.name, selectedPersona.id);
          }
        } catch (error) {
          console.error("Connection error:", error);
          alert(
            error instanceof Error 
              ? error.message 
              : "Failed to connect. Check your LiveKit configuration."
          );
          setIsConnecting(false);
        }
      };

      connect();
    }
  }, [showPersonaSelection, isConnecting, connectionDetails, props.roomName, props.region, userChoices.username, selectedPersona]);

  // Show persona selection screen
  if (showPersonaSelection) {
    return (
      <main data-lk-theme="default" style={{ height: "100vh" }}>
        <PersonaSelection
          onSelect={handlePersonaSelect}
          onSkip={handleSkipPersona}
        />
      </main>
    );
  }

  // Show loading while connecting
  if (isConnecting || !connectionDetails) {
    return (
      <main data-lk-theme="default" style={{ height: "100vh", display: "grid", placeItems: "center" }}>
        <div style={{ textAlign: "center" }}>
          <p>Connecting to room: {props.roomName}...</p>
          {selectedPersona && (
            <p style={{ marginTop: "0.5rem", color: "var(--lk-text-secondary, #999)" }}>
              Using persona: {selectedPersona.name}
            </p>
          )}
        </div>
      </main>
    );
  }

  // Show video conference directly
  return (
    <main data-lk-theme="default" style={{ height: "100vh" }}>
      <RoomContext.Provider value={props.roomName}>
        <PersonaContext.Provider value={{ selectedPersona, setSelectedPersona }}>
          <VideoConferenceComponent
            connectionDetails={connectionDetails}
            userChoices={userChoices}
            options={{ codec: props.codec, hq: props.hq }}
            selectedPersona={selectedPersona}
          />
        </PersonaContext.Provider>
      </RoomContext.Provider>
    </main>
  );
}

function VideoConferenceComponent(props: {
  userChoices: LocalUserChoices;
  connectionDetails: ConnectionDetails;
  options: {
    hq: boolean;
    codec: VideoCodec;
  };
  selectedPersona: Persona | null;
}) {
  const e2eePassphrase =
    typeof window !== "undefined" &&
    decodePassphrase(location.hash.substring(1));

  const worker =
    typeof window !== "undefined" &&
    e2eePassphrase &&
    new Worker(new URL("livekit-client/e2ee-worker", import.meta.url));
  const e2eeEnabled = !!(e2eePassphrase && worker);
  const keyProvider = new ExternalE2EEKeyProvider();
  const [e2eeSetupComplete, setE2eeSetupComplete] = React.useState(false);

  const roomOptions = React.useMemo((): RoomOptions => {
    let videoCodec: VideoCodec | undefined = props.options.codec
      ? props.options.codec
      : "h264";
    if (e2eeEnabled && (videoCodec === "av1" || videoCodec === "vp9")) {
      videoCodec = undefined;
    }
    return {
      videoCaptureDefaults: {
        deviceId: props.userChoices.videoDeviceId ?? undefined,
        resolution: props.options.hq ? VideoPresets.h2160 : VideoPresets.h720,
      },
      publishDefaults: {
        dtx: false,
        videoSimulcastLayers: props.options.hq
          ? [VideoPresets.h1080, VideoPresets.h720]
          : [VideoPresets.h540, VideoPresets.h216],
        red: !e2eeEnabled,
        videoCodec,
      },
      audioCaptureDefaults: {
        deviceId: props.userChoices.audioDeviceId ?? undefined,
      },
      adaptiveStream: { pixelDensity: "screen" },
      dynacast: true,
      e2ee: e2eeEnabled
        ? {
            keyProvider,
            worker,
          }
        : undefined,
    };
  }, [props.userChoices, props.options.hq, props.options.codec]);

  const room = React.useMemo(() => new Room(roomOptions), []);

  React.useEffect(() => {
    if (e2eeEnabled) {
      keyProvider
        .setKey(decodePassphrase(e2eePassphrase))
        .then(() => {
          room.setE2EEEnabled(true).catch((e) => {
            if (e instanceof DeviceUnsupportedError) {
              alert(
                `You're trying to join an encrypted meeting, but your browser does not support it. Please update it to the latest version and try again.`
              );
              console.error(e);
            } else {
              throw e;
            }
          });
        })
        .then(() => setE2eeSetupComplete(true));
    } else {
      setE2eeSetupComplete(true);
    }
  }, [e2eeEnabled, room, e2eePassphrase]);

  const connectOptions = React.useMemo((): RoomConnectOptions => {
    // Metadata is now included in the access token, not in connectOptions
    return {
      autoSubscribe: true,
    };
  }, []);

  const router = useRouter();
  const handleOnLeave = React.useCallback(() => router.push("/"), [router]);
  const handleError = React.useCallback((error: Error) => {
    console.error(error);
    alert(
      `Encountered an unexpected error, check the console logs for details: ${error.message}`
    );
  }, []);
  const handleEncryptionError = React.useCallback((error: Error) => {
    console.error(error);
    alert(
      `Encountered an unexpected encryption error, check the console logs for details: ${error.message}`
    );
  }, []);

  return (
    <div className="w-full h-screen max-h-screen overflow-hidden">
      <LiveKitRoom
        connect={e2eeSetupComplete}
        room={room}
        token={props.connectionDetails.participantToken}
        serverUrl={props.connectionDetails.serverUrl}
        connectOptions={connectOptions}
        video={props.userChoices.videoEnabled}
        audio={props.userChoices.audioEnabled}
        onDisconnected={handleOnLeave}
        onEncryptionError={handleEncryptionError}
        onError={handleError}
      >
        <VideoConference
          chatMessageFormatter={formatChatMessageLinks}
          SettingsComponent={SHOW_SETTINGS_MENU ? SettingsMenu : undefined}
        />
        <DebugMode />
        <RecordingIndicator />
      </LiveKitRoom>
    </div>
  );
}
