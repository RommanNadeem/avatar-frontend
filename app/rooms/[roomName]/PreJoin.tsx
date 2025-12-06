import type { LocalUserChoices } from "@livekit/components-core";
import { defaultUserChoices, log } from "@livekit/components-core";
import {
  MediaDeviceMenu,
  ParticipantPlaceholder,
  PreJoinProps,
  TrackToggle,
  //   useMediaDevices,
  usePersistentUserChoices,
  usePreviewTracks,
} from "@livekit/components-react";
import type { LocalAudioTrack, LocalVideoTrack } from "livekit-client";
import {
  Track,
  //   VideoPresets,
  //   createLocalAudioTrack,
  //   createLocalVideoTrack,
  facingModeFromLocalTrack,
} from "livekit-client";
import * as React from "react";

export function PreJoin({
  defaults = {},
  onValidate,
  onSubmit,
  onError,
  debug,
  joinLabel = "Join Room",
  micLabel = "Microphone",
  camLabel = "Camera",
  userLabel = "Username",
  persistUserChoices = true,
  videoProcessor,
  ...htmlProps
}: PreJoinProps) {
  const [userChoices, setUserChoices] = React.useState(defaultUserChoices);

  // TODO: Remove and pipe `defaults` object directly into `usePersistentUserChoices` once we fully switch from type `LocalUserChoices` to `UserChoices`.
  const partialDefaults: Partial<LocalUserChoices> = {
    ...(defaults.audioDeviceId !== undefined && {
      audioDeviceId: defaults.audioDeviceId,
    }),
    ...(defaults.videoDeviceId !== undefined && {
      videoDeviceId: defaults.videoDeviceId,
    }),
    ...(defaults.audioEnabled !== undefined && {
      audioEnabled: defaults.audioEnabled,
    }),
    ...(defaults.videoEnabled !== undefined && {
      videoEnabled: defaults.videoEnabled,
    }),
    ...(defaults.username !== undefined && { username: defaults.username }),
  };

  const {
    userChoices: initialUserChoices,
    saveAudioInputDeviceId,
    saveAudioInputEnabled,
    saveVideoInputDeviceId,
    saveVideoInputEnabled,
    saveUsername,
  } = usePersistentUserChoices({
    defaults: partialDefaults,
    preventSave: !persistUserChoices,
    preventLoad: !persistUserChoices,
  });

  // Initialize device settings
  const [audioEnabled, setAudioEnabled] = React.useState<boolean>(
    initialUserChoices.audioEnabled
  );
  const [videoEnabled, setVideoEnabled] = React.useState<boolean>(
    initialUserChoices.videoEnabled
  );
  const [audioDeviceId, setAudioDeviceId] = React.useState<string>(
    initialUserChoices.audioDeviceId
  );
  const [videoDeviceId, setVideoDeviceId] = React.useState<string>(
    initialUserChoices.videoDeviceId
  );
  const [username, setUsername] = React.useState(initialUserChoices.username);

  // Save user choices to persistent storage.
  // Using refs to track previous values to avoid infinite loops
  const prevAudioEnabled = React.useRef(audioEnabled);
  const prevVideoEnabled = React.useRef(videoEnabled);
  const prevAudioDeviceId = React.useRef(audioDeviceId);
  const prevVideoDeviceId = React.useRef(videoDeviceId);
  const prevUsername = React.useRef(username);

  React.useEffect(() => {
    if (prevAudioEnabled.current !== audioEnabled) {
      saveAudioInputEnabled(audioEnabled);
      prevAudioEnabled.current = audioEnabled;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioEnabled]);
  React.useEffect(() => {
    if (prevVideoEnabled.current !== videoEnabled) {
      saveVideoInputEnabled(videoEnabled);
      prevVideoEnabled.current = videoEnabled;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoEnabled]);
  React.useEffect(() => {
    if (prevAudioDeviceId.current !== audioDeviceId) {
      saveAudioInputDeviceId(audioDeviceId);
      prevAudioDeviceId.current = audioDeviceId;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioDeviceId]);
  React.useEffect(() => {
    if (prevVideoDeviceId.current !== videoDeviceId) {
      saveVideoInputDeviceId(videoDeviceId);
      prevVideoDeviceId.current = videoDeviceId;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoDeviceId]);
  React.useEffect(() => {
    if (prevUsername.current !== username) {
      saveUsername(username);
      prevUsername.current = username;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  // Check if mediaDevices API is available
  const mediaDevicesAvailable = React.useMemo(() => {
    if (typeof window === "undefined") return false;
    const nav = navigator as Navigator & {
      getUserMedia?: typeof navigator.mediaDevices.getUserMedia;
      webkitGetUserMedia?: typeof navigator.mediaDevices.getUserMedia;
      mozGetUserMedia?: typeof navigator.mediaDevices.getUserMedia;
    };
    return !!(
      navigator?.mediaDevices?.getUserMedia ||
      nav?.getUserMedia ||
      nav?.webkitGetUserMedia ||
      nav?.mozGetUserMedia
    );
  }, []);

  const tracks = usePreviewTracks(
    {
      audio: audioEnabled && mediaDevicesAvailable
        ? { deviceId: audioDeviceId }
        : false,
      video: videoEnabled && mediaDevicesAvailable
        ? {
            deviceId: videoDeviceId,
            processor: videoProcessor,
          }
        : false,
    },
    (error) => {
      if (error && !mediaDevicesAvailable) {
        const mediaError = new Error(
          "Media devices API is not available. Please use a modern browser with camera/microphone support."
        );
        onError?.(mediaError);
      } else {
        onError?.(error);
      }
    }
  );

  const videoEl = React.useRef(null);

  const videoTrack = React.useMemo(
    () =>
      tracks?.filter(
        (track) => track.kind === Track.Kind.Video
      )[0] as LocalVideoTrack,
    [tracks]
  );

  const facingMode = React.useMemo(() => {
    if (videoTrack) {
      const { facingMode } = facingModeFromLocalTrack(videoTrack);
      return facingMode;
    } else {
      return "undefined";
    }
  }, [videoTrack]);

  const audioTrack = React.useMemo(
    () =>
      tracks?.filter(
        (track) => track.kind === Track.Kind.Audio
      )[0] as LocalAudioTrack,
    [tracks]
  );

  React.useEffect(() => {
    if (videoEl.current && videoTrack) {
      videoTrack.unmute();
      videoTrack.attach(videoEl.current);
    }

    return () => {
      videoTrack?.detach();
    };
  }, [videoTrack]);

  const [isValid, setIsValid] = React.useState<boolean>();

  const handleValidation = React.useCallback(
    (values: LocalUserChoices) => {
      if (typeof onValidate === "function") {
        return onValidate(values);
      } else {
        return values.username !== "";
      }
    },
    [onValidate]
  );

  React.useEffect(() => {
    const newUserChoices = {
      username,
      videoEnabled,
      videoDeviceId,
      audioEnabled,
      audioDeviceId,
    };
    setUserChoices(newUserChoices);
    setIsValid(handleValidation(newUserChoices));
  }, [
    username,
    videoEnabled,
    handleValidation,
    audioEnabled,
    audioDeviceId,
    videoDeviceId,
  ]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (handleValidation(userChoices)) {
      if (typeof onSubmit === "function") {
        onSubmit(userChoices);
      }
    } else {
      log.warn("Validation failed with: ", userChoices);
    }
  }

  return (
    <div className="lk-prejoin !bg-background" {...htmlProps}>
      <div className="lk-video-container">
        {videoTrack && (
          <video
            ref={videoEl}
            width="1280"
            height="720"
            data-lk-facing-mode={facingMode}
          />
        )}
        {(!videoTrack || !videoEnabled) && (
          <div className="lk-camera-off-note">
            <ParticipantPlaceholder />
          </div>
        )}
      </div>
      <div className="lk-button-group-container">
        <div className="lk-button-group audio !h-11">
          <TrackToggle
            initialState={audioEnabled}
            source={Track.Source.Microphone}
            onChange={(enabled) => setAudioEnabled(enabled)}
          >
            {micLabel}
          </TrackToggle>
          <div className="lk-button-group-menu">
            <MediaDeviceMenu
              initialSelection={audioDeviceId}
              kind="audioinput"
              disabled={!audioTrack}
              tracks={{ audioinput: audioTrack }}
              onActiveDeviceChange={(_, id) => setAudioDeviceId(id)}
            />
          </div>
        </div>
        <div className="lk-button-group video !h-11">
          <TrackToggle
            initialState={videoEnabled}
            source={Track.Source.Camera}
            onChange={(enabled) => setVideoEnabled(enabled)}
          >
            {camLabel}
          </TrackToggle>
          <div className="lk-button-group-menu">
            <MediaDeviceMenu
              initialSelection={videoDeviceId}
              kind="videoinput"
              disabled={!videoTrack}
              tracks={{ videoinput: videoTrack }}
              onActiveDeviceChange={(_, id) => setVideoDeviceId(id)}
            />
          </div>
        </div>
      </div>

      <form className="lk-username-container">
        <input
          className="lk-form-control"
          id="username"
          name="username"
          type="text"
          defaultValue={username}
          placeholder={userLabel}
          onChange={(inputEl) => setUsername(inputEl.target.value)}
          autoComplete="off"
        />
        <button
          className="lk-button lk-join-button"
          type="submit"
          onClick={handleSubmit}
          disabled={!isValid}
        >
          {joinLabel}
        </button>
      </form>

      {debug && (
        <>
          <strong>User Choices:</strong>
          <ul
            className="lk-list"
            style={{ overflow: "hidden", maxWidth: "15rem" }}
          >
            <li>Username: {`${userChoices.username}`}</li>
            <li>Video Enabled: {`${userChoices.videoEnabled}`}</li>
            <li>Audio Enabled: {`${userChoices.audioEnabled}`}</li>
            <li>Video Device: {`${userChoices.videoDeviceId}`}</li>
            <li>Audio Device: {`${userChoices.audioDeviceId}`}</li>
          </ul>
        </>
      )}
    </div>
  );
}
