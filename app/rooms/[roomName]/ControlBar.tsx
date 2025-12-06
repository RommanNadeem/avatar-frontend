import { supportsScreenSharing } from "@livekit/components-core";
import {
  ChatIcon,
  ChatToggle,
  ControlBarProps,
  DisconnectButton,
  LeaveIcon,
  MediaDeviceMenu,
  StartMediaButton,
  TrackToggle,
  useLocalParticipantPermissions,
  useMaybeLayoutContext,
  usePersistentUserChoices,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import * as React from "react";
import { useState } from "react";
import { useRoomName } from "./RoomContext";
import { useMediaQuery } from "./useMediaQuery";
import { Bot, BotOff } from "lucide-react";

export function ControlBar({
  variation,
  controls,
  saveUserChoices = true,
  onDeviceError,
  ...props
}: ControlBarProps) {
  const roomName = useRoomName();

  const [isChatOpen, setIsChatOpen] = React.useState(false);
  const [agentCalling, setAgentCalling] = useState(false);

  const layoutContext = useMaybeLayoutContext();
  React.useEffect(() => {
    if (layoutContext?.widget.state?.showChat !== undefined) {
      setIsChatOpen(layoutContext?.widget.state?.showChat);
    }
  }, [layoutContext?.widget.state?.showChat]);
  const isTooLittleSpace = useMediaQuery(
    `(max-width: ${isChatOpen ? 1000 : 760}px)` // LiveKit default
    //  `(max-width: ${isChatOpen ? 1315 : 1075}px)`
  );

  const defaultVariation = isTooLittleSpace ? "minimal" : "verbose";
  variation ??= defaultVariation;

  const visibleControls = { leave: true, ...controls };

  const localPermissions = useLocalParticipantPermissions();

  if (!localPermissions) {
    visibleControls.camera = false;
    visibleControls.chat = false;
    visibleControls.microphone = false;
    visibleControls.screenShare = false;
  } else {
    visibleControls.camera ??= localPermissions.canPublish;
    visibleControls.microphone ??= localPermissions.canPublish;
    visibleControls.screenShare ??= localPermissions.canPublish;
    visibleControls.chat ??= localPermissions.canPublishData && controls?.chat;
  }

  const showIcon = React.useMemo(
    () => variation === "minimal" || variation === "verbose",
    [variation]
  );
  const showText = React.useMemo(
    () => variation === "textOnly" || variation === "verbose",
    [variation]
  );

  const browserSupportsScreenSharing = supportsScreenSharing();

  const [isScreenShareEnabled, setIsScreenShareEnabled] = React.useState(false);

  const onScreenShareChange = React.useCallback(
    (enabled: boolean) => {
      setIsScreenShareEnabled(enabled);
    },
    [setIsScreenShareEnabled]
  );

  const {
    saveAudioInputEnabled,
    saveVideoInputEnabled,
    saveAudioInputDeviceId,
    saveVideoInputDeviceId,
  } = usePersistentUserChoices({ preventSave: !saveUserChoices });

  const microphoneOnChange = React.useCallback(
    (enabled: boolean, isUserInitiated: boolean) =>
      isUserInitiated ? saveAudioInputEnabled(enabled) : null,
    [saveAudioInputEnabled]
  );

  const cameraOnChange = React.useCallback(
    (enabled: boolean, isUserInitiated: boolean) =>
      isUserInitiated ? saveVideoInputEnabled(enabled) : null,
    [saveVideoInputEnabled]
  );

  // Custom Agent Calling
  // ==================================================================
  const onRequestAgent = React.useCallback(async (agentName?: string) => {
    try {
      setAgentCalling(true);
      const response = await fetch("/api/livekit/request-agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ room: roomName, agentName }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `Failed to request agent: ${response.status} ${response.statusText}`);
      }

      const responseData = await response.json();
      console.log("Agent requested:", responseData);
    } catch (error) {
      console.error("Error requesting agent:", error);
      // Show user-friendly error message
      alert(error instanceof Error ? error.message : "Failed to request agent. Please check your LiveKit configuration.");
    } finally {
      setAgentCalling(false);
    }
  }, [roomName, setAgentCalling]);

  const onCloseAgent = React.useCallback(async () => {
    try {
      const response = await fetch(
        `/api/livekit/stop-agent?room-name=${roomName}`,
        {
          method: "DELETE",
        }
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `Failed to stop agent: ${response.status} ${response.statusText}`);
      }
      const result = await response.json();
      console.log("Agent stopped:", result);
    } catch (error) {
      console.error("Error stopping agent:", error);
      // Show user-friendly error message
      alert(error instanceof Error ? error.message : "Failed to stop agent. Please check your LiveKit configuration.");
    }
  }, [roomName]);
  // ==================================================================

  return (
    <div {...props} className="lk-control-bar">
      {visibleControls.microphone && (
        <div className="lk-button-group">
          <TrackToggle
            source={Track.Source.Microphone}
            showIcon={showIcon}
            onChange={microphoneOnChange}
            onDeviceError={(error) =>
              onDeviceError?.({ source: Track.Source.Microphone, error })
            }
          >
            {showText && "Microphone"}
          </TrackToggle>
          <div className="lk-button-group-menu">
            <MediaDeviceMenu
              kind="audioinput"
              onActiveDeviceChange={(_kind, deviceId) =>
                saveAudioInputDeviceId(deviceId ?? "default")
              }
            />
          </div>
        </div>
      )}
      {visibleControls.camera && (
        <div className="lk-button-group">
          <TrackToggle
            source={Track.Source.Camera}
            showIcon={showIcon}
            onChange={cameraOnChange}
            onDeviceError={(error) =>
              onDeviceError?.({ source: Track.Source.Camera, error })
            }
          >
            {showText && "Camera"}
          </TrackToggle>
          <div className="lk-button-group-menu">
            <MediaDeviceMenu
              kind="videoinput"
              onActiveDeviceChange={(_kind, deviceId) =>
                saveVideoInputDeviceId(deviceId ?? "default")
              }
            />
          </div>
        </div>
      )}
      {visibleControls.screenShare && browserSupportsScreenSharing && (
        <TrackToggle
          source={Track.Source.ScreenShare}
          captureOptions={{ audio: true, selfBrowserSurface: "include" }}
          showIcon={showIcon}
          onChange={onScreenShareChange}
          onDeviceError={(error) =>
            onDeviceError?.({ source: Track.Source.ScreenShare, error })
          }
        >
          {showText &&
            (isScreenShareEnabled ? "Stop screen share" : "Share screen")}
        </TrackToggle>
      )}
      {visibleControls.chat && (
        <ChatToggle>
          {showIcon && <ChatIcon />}
          {showText && "Chat"}
        </ChatToggle>
      )}
      <button
        className="lk-button"
        onClick={() => onRequestAgent()}
        disabled={agentCalling}
      >
        <Bot className="max-w-5" />
        {showText && "Voice Agent"}
      </button>
      <button
        className="lk-button"
        onClick={() => onRequestAgent("anam-avatar-agent")}
        disabled={agentCalling}
      >
        <Bot className="max-w-5" />
        {showText && "ANAM Avatar"}
      </button>
      <button
        className="lk-button !text-red-600 !border !border-solid !border-red-600"
        onClick={onCloseAgent}
      >
        <BotOff className="max-w-5" />
        {showText && "Stop Agent"}
      </button>
      {visibleControls.leave && (
        <DisconnectButton>
          {showIcon && <LeaveIcon />}
          {showText && "Leave"}
        </DisconnectButton>
      )}
      <StartMediaButton />
    </div>
  );
}
