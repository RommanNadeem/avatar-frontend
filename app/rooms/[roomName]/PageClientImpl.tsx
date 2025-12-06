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
  RoomEvent,
  ConnectionState,
} from "livekit-client";
import { useRouter } from "next/navigation";
import React from "react";
import { RoomContext, useRoomName } from "./RoomContext";
import { VideoConference } from "./VideoConference";
import { PreJoin } from "./PreJoin";

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
  const [preJoinChoices, setPreJoinChoices] = React.useState<
    LocalUserChoices | undefined
  >(undefined);
  const preJoinDefaults = React.useMemo(() => {
    return {
      username: "",
      videoEnabled: false,
      audioEnabled: true,
    };
  }, []);
  const [connectionDetails, setConnectionDetails] = React.useState<
    ConnectionDetails | undefined
  >(undefined);

  const handlePreJoinSubmit = React.useCallback(
    async (values: LocalUserChoices) => {
      setPreJoinChoices(values);
      const url = new URL(CONN_DETAILS_ENDPOINT, window.location.origin);
      url.searchParams.append("roomName", props.roomName);
      url.searchParams.append("participantName", values.username);
      if (props.region) {
        url.searchParams.append("region", props.region);
      }
      try {
        const connectionDetailsResp = await fetch(url.toString());
        if (!connectionDetailsResp.ok) {
          const errorText = await connectionDetailsResp.text();
          throw new Error(
            errorText ||
              `Failed to get connection details: ${connectionDetailsResp.status}`
          );
        }
        const connectionDetailsData = await connectionDetailsResp.json();
        setConnectionDetails(connectionDetailsData);
      } catch (error) {
        console.error("Error getting connection details:", error);
        alert(
          error instanceof Error
            ? error.message
            : "Failed to connect. Please check your LiveKit configuration."
        );
        setPreJoinChoices(undefined);
      }
    },
    [props.roomName, props.region]
  );

  const handlePreJoinError = React.useCallback((e: Error | unknown) => {
    console.error("Error in handlePreJoinError:", e);

    let errorMessage = "An error occurred while accessing your media devices.";

    if (e instanceof Error) {
      if (
        e.message.includes("getUserMedia") ||
        e.message.includes("mediaDevices")
      ) {
        errorMessage =
          "Unable to access camera/microphone. Please ensure:\n" +
          "1. You're using a secure connection (HTTPS or localhost)\n" +
          "2. Your browser supports media devices\n" +
          "3. You've granted camera/microphone permissions";
      } else if (
        e.name === "NotAllowedError" ||
        e.message.includes("Permission denied")
      ) {
        errorMessage =
          "Camera/microphone access was denied. Please allow access in your browser settings and try again.";
      } else if (
        e.name === "NotFoundError" ||
        e.message.includes("not found")
      ) {
        errorMessage =
          "No camera or microphone found. Please connect a device and try again.";
      } else {
        errorMessage = e.message || errorMessage;
      }
    }

    alert(errorMessage);
  }, []);

  // const handleValidate = (options: LocalUserChoices): boolean => {
  //   if (!options.videoEnabled) {
  //     alert("Please enable your video before joining.");
  //     return false;
  //   }
  //   return true;
  // };

  return (
    <main data-lk-theme="default" style={{ height: "100vh" }}>
      {connectionDetails === undefined || preJoinChoices === undefined ? (
        <div style={{ display: "grid", placeItems: "center", height: "100%" }}>
          <PreJoin
            defaults={preJoinDefaults}
            onSubmit={handlePreJoinSubmit}
            onError={handlePreJoinError}
            // onValidate={handleValidate}
          />
        </div>
      ) : (
        // <VideoConferenceComponent
        //   connectionDetails={connectionDetails}
        //   userChoices={preJoinChoices}
        //   options={{ codec: props.codec, hq: props.hq }}
        // />
        <RoomContext.Provider value={props.roomName}>
          <VideoConferenceComponent
            connectionDetails={connectionDetails}
            userChoices={preJoinChoices}
            options={{ codec: props.codec, hq: props.hq }}
          />
        </RoomContext.Provider>
      )}
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
    return {
      autoSubscribe: true,
    };
  }, []);

  const router = useRouter();
  const roomName = useRoomName();
  const agentRequestedRef = React.useRef(false);

  // Automatically connect to ANAM agent when room is connected
  React.useEffect(() => {
    if (!room || !roomName || agentRequestedRef.current) {
      return;
    }

    const handleConnected = () => {
      if (agentRequestedRef.current) {
        return;
      }
      agentRequestedRef.current = true;

      // Automatically request ANAM agent
      fetch("/api/livekit/request-agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          room: roomName,
          agentName: "anam-avatar-agent",
        }),
      })
        .then((response) => {
          if (!response.ok) {
            return response.json().then((errorData) => {
              throw new Error(
                errorData.error ||
                  `Failed to request agent: ${response.status} ${response.statusText}`
              );
            });
          }
          return response.json();
        })
        .then((responseData) => {
          console.log("ANAM agent automatically requested:", responseData);
        })
        .catch((error) => {
          console.error("Error automatically requesting ANAM agent:", error);
          // Don't show alert for automatic connection failures to avoid interrupting user
        });
    };

    // Check if already connected
    if (room.state === ConnectionState.Connected) {
      handleConnected();
    } else {
      // Listen for connection event
      room.on(RoomEvent.Connected, handleConnected);
    }

    return () => {
      room.off(RoomEvent.Connected, handleConnected);
    };
  }, [room, roomName]);

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
