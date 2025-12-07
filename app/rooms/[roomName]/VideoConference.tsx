import type {
  //   MessageDecoder,
  //   MessageEncoder,
  TrackReferenceOrPlaceholder,
  WidgetState,
} from "@livekit/components-core";
import {
  isEqualTrackRef,
  isTrackReference,
  isWeb,
  log,
} from "@livekit/components-core";
import type { MessageFormatter } from "@livekit/components-react";
import {
  CarouselLayout,
  ConnectionStateToast,
  FocusLayout,
  FocusLayoutContainer,
  GridLayout,
  LayoutContextProvider,
  //   ParticipantTile,
  RoomAudioRenderer,
  useCreateLayoutContext,
  usePinnedTracks,
  useTracks,
  useParticipants,
} from "@livekit/components-react";
import { RoomEvent, Track, ParticipantKind } from "livekit-client";
import * as React from "react";
import { ControlBar } from "./ControlBar";
import { ParticipantTile } from "./ParticipantTile";
import { AgentLoader } from "./AgentLoader";
import { usePersona } from "./PersonaContext";

export interface VideoConferenceProps
  extends React.HTMLAttributes<HTMLDivElement> {
  chatMessageFormatter?: MessageFormatter;
  //   chatMessageEncoder?: MessageEncoder;
  //   chatMessageDecoder?: MessageDecoder;
  /** @alpha */
  SettingsComponent?: React.ComponentType;
}

export function VideoConference({
  chatMessageFormatter,
  //   chatMessageDecoder,
  //   chatMessageEncoder,
  SettingsComponent,
  ...props
}: VideoConferenceProps) {
  const participants = useParticipants();
  const { selectedPersona } = usePersona();
  const [widgetState, setWidgetState] = React.useState<WidgetState>({
    showChat: false,
    unreadMessages: 0,
    showSettings: false,
  });
  const lastAutoFocusedScreenShareTrack =
    React.useRef<TrackReferenceOrPlaceholder | null>(null);

  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { updateOnlyOn: [RoomEvent.ActiveSpeakersChanged], onlySubscribed: false }
  );

  const widgetUpdate = (state: WidgetState) => {
    log.debug("updating widget state", state);
    setWidgetState(state);
  };

  const layoutContext = useCreateLayoutContext();

  // Filter out placeholders - only pass actual track references to layouts
  const actualTracks = tracks.filter(isTrackReference);

  // Detect agent participants (look for avatar output participants)
  const agentParticipants = React.useMemo(() => {
    return participants.filter((p) => {
      // Look for participants that publish on behalf (avatar output)
      const publishOnBehalf = p.attributes?.["lk.publish_on_behalf"];
      const agentType = p.attributes?.["agentType"];
      return (
        (p.isAgent || p.kind === ParticipantKind.AGENT) &&
        publishOnBehalf === "true" &&
        agentType === "avatar"
      );
    });
  }, [participants]);

  // Check if agent is connecting (agent participant exists but no video track yet)
  const isAgentConnecting = React.useMemo(() => {
    if (agentParticipants.length === 0) return false;
    const agent = agentParticipants[0];
    const hasVideoTrack = actualTracks.some(
      (track) =>
        track.participant.identity === agent.identity &&
        track.publication.source === Track.Source.Camera &&
        track.publication.isSubscribed
    );
    return !hasVideoTrack;
  }, [agentParticipants, actualTracks]);

  // Separate agent and user tracks
  const agentTracks = actualTracks.filter((track) => {
    const participant = track.participant;
    const publishOnBehalf = participant.attributes?.["lk.publish_on_behalf"];
    const agentType = participant.attributes?.["agentType"];
    return (
      (participant.isAgent || participant.kind === ParticipantKind.AGENT) &&
      publishOnBehalf === "true" &&
      agentType === "avatar"
    );
  });

  const userTracks = actualTracks.filter((track) => {
    const participant = track.participant;
    const publishOnBehalf = participant.attributes?.["lk.publish_on_behalf"];
    const agentType = participant.attributes?.["agentType"];
    // User tracks are not agents, or agents that don't publish on behalf
    const isUser = !(
      (participant.isAgent || participant.kind === ParticipantKind.AGENT) &&
      publishOnBehalf === "true" &&
      agentType === "avatar"
    );
    
    // For user camera tracks, only include if camera is enabled and not muted
    if (isUser && track.publication.source === Track.Source.Camera) {
      return (
        track.publication.isSubscribed &&
        track.publication.track &&
        !track.publication.isMuted &&
        track.publication.track.isEnabled
      );
    }
    
    return isUser;
  });

  const screenShareTracks = actualTracks.filter(
    (track) => track.publication.source === Track.Source.ScreenShare
  );

  const focusTrack = usePinnedTracks(layoutContext)?.[0];
  const carouselTracks = actualTracks.filter(
    (track) => !isEqualTrackRef(track, focusTrack)
  );

  // Auto-pin agent when it joins with video
  React.useEffect(() => {
    if (agentTracks.length > 0 && !focusTrack) {
      const agentVideoTrack = agentTracks.find(
        (track) => track.publication.source === Track.Source.Camera
      );
      if (agentVideoTrack && agentVideoTrack.publication.isSubscribed) {
        layoutContext.pin.dispatch?.({
          msg: "set_pin",
          trackReference: agentVideoTrack,
        });
      }
    }
  }, [agentTracks, focusTrack, layoutContext]);

  React.useEffect(() => {
    // If screen share tracks are published, and no pin is set explicitly, auto set the screen share.
    if (
      screenShareTracks.some((track) => track.publication.isSubscribed) &&
      lastAutoFocusedScreenShareTrack.current === null
    ) {
      log.debug("Auto set screen share focus:", {
        newScreenShareTrack: screenShareTracks[0],
      });
      layoutContext.pin.dispatch?.({
        msg: "set_pin",
        trackReference: screenShareTracks[0],
      });
      lastAutoFocusedScreenShareTrack.current = screenShareTracks[0];
    } else if (
      lastAutoFocusedScreenShareTrack.current &&
      !screenShareTracks.some(
        (track) =>
          track.publication.trackSid ===
          lastAutoFocusedScreenShareTrack.current?.publication?.trackSid
      )
    ) {
      log.debug("Auto clearing screen share focus.");
      layoutContext.pin.dispatch?.({ msg: "clear_pin" });
      lastAutoFocusedScreenShareTrack.current = null;
    }
    if (focusTrack && !isTrackReference(focusTrack)) {
      const updatedFocusTrack = actualTracks.find(
        (tr) =>
          tr.participant.identity === focusTrack.participant.identity &&
          tr.source === focusTrack.source
      );
      if (
        updatedFocusTrack !== focusTrack &&
        isTrackReference(updatedFocusTrack)
      ) {
        layoutContext.pin.dispatch?.({
          msg: "set_pin",
          trackReference: updatedFocusTrack,
        });
      }
    }
  }, [
    screenShareTracks
      .map(
        (ref) => `${ref.publication.trackSid}_${ref.publication.isSubscribed}`
      )
      .join(),
    focusTrack?.publication?.trackSid,
    actualTracks,
  ]);

  return (
    <div className="lk-video-conference" {...props}>
      {isWeb() && (
        <LayoutContextProvider
          value={layoutContext}
          // onPinChange={handleFocusStateChange}
          onWidgetChange={widgetUpdate}
        >
          <div className="lk-video-conference-inner" style={{ position: "relative" }}>
            {/* Show loader when agent is connecting */}
            {isAgentConnecting && (
              <AgentLoader 
                personaName={selectedPersona?.name}
                personaImage={selectedPersona?.image}
              />
            )}

            {/* Custom layout: Agent big in center, user small in corner */}
            {(agentTracks.length > 0 || isAgentConnecting) && userTracks.length > 0 ? (
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {/* Agent in center (big) - show placeholder if connecting */}
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {agentTracks.length > 0 ? (
                    agentTracks
                      .filter((track) => track.publication.source === Track.Source.Camera)
                      .map((track) => (
                        <div
                          key={track.publication.trackSid}
                          style={{
                            width: "100%",
                            height: "100%",
                            maxWidth: "100%",
                            maxHeight: "100%",
                          }}
                        >
                          <ParticipantTile trackRef={track} />
                        </div>
                      ))
                  ) : isAgentConnecting ? (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "var(--lk-bg-secondary, #f5f5f5)",
                      }}
                    >
                      {/* Placeholder will be shown by loader overlay */}
                    </div>
                  ) : null}
                </div>

                {/* User in bottom-right corner (small) - only show if camera is on */}
                {userTracks.filter((track) => track.publication.source === Track.Source.Camera).length > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: "80px",
                      right: "20px",
                      width: "200px",
                      height: "150px",
                      zIndex: 5,
                      borderRadius: "12px",
                      overflow: "hidden",
                      border: "2px solid var(--lk-border, #e0e0e0)",
                      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
                    }}
                  >
                    {userTracks
                      .filter((track) => track.publication.source === Track.Source.Camera)
                      .map((track) => (
                        <ParticipantTile key={track.publication.trackSid} trackRef={track} />
                      ))}
                  </div>
                )}
              </div>
            ) : !focusTrack ? (
              <div className="lk-grid-layout-wrapper">
                <GridLayout tracks={actualTracks}>
                  <ParticipantTile />
                </GridLayout>
              </div>
            ) : (
              <div className="lk-focus-layout-wrapper">
                <FocusLayoutContainer>
                  <CarouselLayout tracks={carouselTracks}>
                    <ParticipantTile />
                  </CarouselLayout>
                  {focusTrack && <FocusLayout trackRef={focusTrack} />}
                </FocusLayoutContainer>
              </div>
            )}
            <ControlBar
              controls={{ chat: false, settings: !!SettingsComponent }}
            />
          </div>
          {SettingsComponent && (
            <div
              className="lk-settings-menu-modal"
              style={{ display: widgetState.showSettings ? "block" : "none" }}
            >
              <SettingsComponent />
            </div>
          )}
        </LayoutContextProvider>
      )}
      <RoomAudioRenderer />
      <ConnectionStateToast />
    </div>
  );
}
