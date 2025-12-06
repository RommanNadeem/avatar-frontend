import { NextRequest, NextResponse } from "next/server";
import {
  AgentDispatchClient,
  // RoomServiceClient
} from "livekit-server-sdk";

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

// Convert wss:// to https:// for API calls (AgentDispatchClient needs HTTP)
function convertToHttpUrl(url: string): string {
  if (url.startsWith("wss://")) {
    return url.replace("wss://", "https://");
  }
  if (url.startsWith("ws://")) {
    return url.replace("ws://", "http://");
  }
  return url;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { room, agentName, avatarId, personaName } = body;  // Add avatarId and personaName

    if (!room) {
      return NextResponse.json(
        { error: "Room name is required" },
        { status: 400 }
      );
    }

    const { LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL } = process.env;

    if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !LIVEKIT_URL) {
      return NextResponse.json(
        { error: "Server configuration is missing. Please set LIVEKIT_API_KEY, LIVEKIT_API_SECRET, and LIVEKIT_URL in your environment variables." },
        { status: 500 }
      );
    }

    if (!isValidUrl(LIVEKIT_URL)) {
      return NextResponse.json(
        { error: `Invalid LiveKit URL configuration. Please set a valid LIVEKIT_URL in your environment variables. Current value appears to be a placeholder: "${LIVEKIT_URL}"` },
        { status: 500 }
      );
    }

    if (LIVEKIT_API_KEY.includes("<") || LIVEKIT_API_KEY.includes("your-")) {
      return NextResponse.json(
        { error: "LiveKit API key is not configured. Please set LIVEKIT_API_KEY in your environment variables." },
        { status: 500 }
      );
    }

    if (LIVEKIT_API_SECRET.includes("<") || LIVEKIT_API_SECRET.includes("your-")) {
      return NextResponse.json(
        { error: "LiveKit API secret is not configured. Please set LIVEKIT_API_SECRET in your environment variables." },
        { status: 500 }
      );
    }

    // Simple: Just create dispatch for the requested agent
    const requestedAgentName = agentName || "anam-avatar-agent";
    
    // Convert wss:// to https:// for API client
    const httpUrl = convertToHttpUrl(LIVEKIT_URL);
    
    console.log(`Requesting agent: ${requestedAgentName} for room: ${room}`);
    console.log(`LiveKit URL (original): ${LIVEKIT_URL}`);
    console.log(`LiveKit URL (converted): ${httpUrl}`);
    console.log(`API Key: ${LIVEKIT_API_KEY?.substring(0, 10)}...`);

    const agentDispatchClient = new AgentDispatchClient(
      httpUrl,
      LIVEKIT_API_KEY,
      LIVEKIT_API_SECRET
    );

    try {
      console.log(`Connecting to LiveKit: ${LIVEKIT_URL}`);
      console.log(`Creating dispatch for room: ${room}, agent: ${requestedAgentName}`);
      
      // Create dispatch with persona metadata (if provided)
      const dispatchMetadata = avatarId && personaName
        ? JSON.stringify({
            type: "anam_avatar",
            avatarId: avatarId,
            personaName: personaName,
          })
        : JSON.stringify({
            type: "anam_avatar"
          });
      
      if (avatarId && personaName) {
        console.log(`📋 Including persona in dispatch metadata: ${personaName} (${avatarId})`);
      }
      
      const dispatch = await agentDispatchClient.createDispatch(room, requestedAgentName, {
        metadata: dispatchMetadata,  // Include persona info in dispatch metadata
      });
      
      console.log(`✅ Dispatch created: ${dispatch.id}`);
      if (avatarId) {
        console.log(`✅ Dispatch metadata: ${dispatchMetadata}`);
      }
      
      return NextResponse.json({ 
        success: true, 
        message: "ANAM avatar requested",
        dispatchId: dispatch.id,
        agentName: requestedAgentName,
        avatarId: avatarId || null,
        personaName: personaName || null,
        room,
      });
    } catch (error) {
      console.error("Error creating dispatch:", error);
      
      // Connection timeout
      if (error instanceof Error && (
        error.message.includes("timeout") || 
        error.message.includes("Connect Timeout") ||
        error.message.includes("UND_ERR_CONNECT_TIMEOUT")
      )) {
        return NextResponse.json(
          { 
            error: `Connection timeout to LiveKit server. Check:\n1. LIVEKIT_URL is correct: ${LIVEKIT_URL}\n2. Network connectivity\n3. Firewall/proxy settings`,
            livekitUrl: LIVEKIT_URL,
          },
          { status: 504 }
        );
      }
      
      // If already exists, that's fine
      if (error instanceof Error && error.message.includes("already exists")) {
        return NextResponse.json({ 
          success: true, 
          message: "Agent already requested",
          agentName: requestedAgentName,
        });
      }
      
      // Room doesn't exist
      if (error instanceof Error && error.message.includes("room does not exist")) {
        return NextResponse.json(
          { 
            error: `Room "${room}" does not exist. Make sure you're connected to the room first.`,
          },
          { status: 404 }
        );
      }
      
      throw error;
    }
  } catch (error) {
    console.error("Error requesting agent:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
