import { randomString } from "@/lib/client-utils";
import { ConnectionDetails } from "@/lib/types";
import {
  AccessToken,
  AccessTokenOptions,
  VideoGrant,
} from "livekit-server-sdk";
import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL;
const COOKIE_KEY = "random-participant-postfix";

function isValidUrl(url: string | undefined): boolean {
  if (!url || url.includes("<") || url.includes("your-")) {
    return false;
  }
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const roomName = request.nextUrl.searchParams.get("roomName");
    const participantName = request.nextUrl.searchParams.get("participantName");
    const metadata = request.nextUrl.searchParams.get("metadata") ?? "";
    const region = request.nextUrl.searchParams.get("region");
    const livekitServerUrl = region ? getLiveKitURL(region) : LIVEKIT_URL;
    let randomParticipantPostfix = request.cookies.get(COOKIE_KEY)?.value;

    if (livekitServerUrl === undefined) {
      return new NextResponse(
        "LiveKit URL is not configured. Please set LIVEKIT_URL in your environment variables.",
        { status: 500 }
      );
    }

    if (!isValidUrl(livekitServerUrl)) {
      return new NextResponse(
        `Invalid LiveKit URL configuration. Please set a valid LIVEKIT_URL in your environment variables. Current value appears to be a placeholder.`,
        { status: 500 }
      );
    }

    if (!API_KEY || API_KEY.includes("<") || API_KEY.includes("your-")) {
      return new NextResponse(
        "LiveKit API key is not configured. Please set LIVEKIT_API_KEY in your environment variables.",
        { status: 500 }
      );
    }

    if (
      !API_SECRET ||
      API_SECRET.includes("<") ||
      API_SECRET.includes("your-")
    ) {
      return new NextResponse(
        "LiveKit API secret is not configured. Please set LIVEKIT_API_SECRET in your environment variables.",
        { status: 500 }
      );
    }

    if (typeof roomName !== "string") {
      return new NextResponse("Missing required query parameter: roomName", {
        status: 400,
      });
    }
    if (participantName === null) {
      return new NextResponse(
        "Missing required query parameter: participantName",
        { status: 400 }
      );
    }

    // Generate participant token
    if (!randomParticipantPostfix) {
      randomParticipantPostfix = randomString(4);
    }

    let participantToken: string;
    try {
      participantToken = await createParticipantToken(
        {
          identity: `${participantName}__${randomParticipantPostfix}`,
          name: participantName,
          metadata,
        },
        roomName
      );
    } catch (tokenError) {
      console.error("Error creating participant token:", tokenError);
      return new NextResponse(
        `Failed to create access token. Please verify that your LIVEKIT_API_KEY and LIVEKIT_API_SECRET are correct and match your LiveKit server. Error: ${
          tokenError instanceof Error ? tokenError.message : "Unknown error"
        }`,
        { status: 500 }
      );
    }

    // Return connection details
    const data: ConnectionDetails = {
      serverUrl: livekitServerUrl,
      roomName: roomName,
      participantToken: participantToken,
      participantName: participantName,
    };

    return new NextResponse(JSON.stringify(data), {
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": `${COOKIE_KEY}=${randomParticipantPostfix}; Path=/; HttpOnly; SameSite=Strict; Secure; Expires=${getCookieExpirationTime()}`,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      return new NextResponse(error.message, { status: 500 });
    }
  }
}

async function createParticipantToken(
  userInfo: AccessTokenOptions,
  roomName: string
): Promise<string> {
  if (!API_KEY || !API_SECRET) {
    throw new Error("API_KEY or API_SECRET is missing");
  }

  try {
    const at = new AccessToken(API_KEY, API_SECRET, userInfo);
    at.ttl = "5m";
    const grant: VideoGrant = {
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
    };
    at.addGrant(grant);
    return await at.toJwt();
  } catch (error) {
    throw new Error(
      `Failed to generate access token: ${
        error instanceof Error ? error.message : "Unknown error"
      }. Please verify your API credentials are correct.`
    );
  }
}

/**
 * Get the LiveKit server URL for the given region.
 */
function getLiveKitURL(region: string | null): string | undefined {
  let targetKey = "LIVEKIT_URL";
  if (region) {
    targetKey = `LIVEKIT_URL_${region}`.toUpperCase();
  }
  const url = process.env[targetKey];
  if (!url) {
    return undefined;
  }
  return url;
}

function getCookieExpirationTime(): string {
  const now = new Date();
  const time = now.getTime();
  const expireTime = time + 60 * 120 * 1000;
  now.setTime(expireTime);
  return now.toUTCString();
}
