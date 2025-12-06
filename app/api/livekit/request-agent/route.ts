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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { room, agentName } = body;

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

    const roomName = room;
    const requestedAgentName = agentName || process.env.NEXT_PUBLIC_AGENT_NAME || "livekit-agent";

    const agentDispatchClient = new AgentDispatchClient(
      LIVEKIT_URL,
      LIVEKIT_API_KEY,
      LIVEKIT_API_SECRET
    );

    // Check if dispatch already exists
    const dispatches = await agentDispatchClient.listDispatch(roomName);
    const existingDispatch = dispatches.find(
      (dispatch) => dispatch.agentName === requestedAgentName
    );

    if (existingDispatch) {
      console.log("Dispatch already exists:", existingDispatch.id);
      // Check if the agent is actually connected by verifying jobs
      try {
        const dispatchDetails = await agentDispatchClient.getDispatch(
          existingDispatch.id,
          roomName
        );
        const jobs = dispatchDetails?.state?.jobs || [];
        console.log("Existing dispatch jobs:", jobs.length);
        
        if (jobs.length > 0) {
          return NextResponse.json({ 
            success: true, 
            message: "Agent dispatch already exists and has active jobs",
            dispatchId: existingDispatch.id 
          });
        }
      } catch (error) {
        console.error("Error checking dispatch details:", error);
        // Continue to create new dispatch if check fails
      }
    }

    // Create new dispatch if none exists or if existing one has no jobs
    try {
      const newDispatch = await agentDispatchClient.createDispatch(roomName, requestedAgentName, {
        metadata: "my_job_metadata",
      });
      console.log("Created new dispatch:", newDispatch);
      return NextResponse.json({ 
        success: true, 
        message: "Agent dispatch created successfully",
        dispatchId: newDispatch.id 
      });
    } catch (error) {
      console.error("Error creating dispatch:", error);
      // If dispatch already exists error, that's okay
      if (error instanceof Error && error.message.includes("already exists")) {
        return NextResponse.json({ 
          success: true, 
          message: "Agent dispatch already exists" 
        });
      }
      throw error;
    }

      //   return NextResponse.json(
      //     { error: "Agent dispatch already exists for the room" },
      //     { status: 404 }
      //   );

      //   const agentJobs = dispatches.find(
      //     (dispatch) => dispatch.agentName === agentName
      //   )?.state?.jobs;
      //   console.log("agentJobs:", agentJobs);

      //   const agentDispatch = await agentDispatchClient.getDispatch(
      //     dispatchId,
      //     roomName
      //   );
      //   console.log("agentDispatch:", agentDispatch);
      //   const jobs = agentDispatch?.state?.jobs;
      //   console.log("jobs:", jobs);

      //   const roomServiceClient = new RoomServiceClient(
      //     LIVEKIT_URL,
      //     LIVEKIT_API_KEY,
      //     LIVEKIT_API_SECRET
      //   );
      //   const listParticipants = await roomServiceClient.listParticipants(
      //     roomName
      //   );
      //   //   console.log("listParticipants:", listParticipants);
      //   const participant = listParticipants.find(
      //     (participant) =>
      //       participant.kind === 4 &&
      //       participant.attributes?.agentName === agentName
      //   );
      //   if (participant) {
      //     // await roomServiceClient.removeParticipant(
      //     //   roomName,
      //     //   participant.identity
      //     // );
      //     // await roomServiceClient.updateParticipant()
      //   } else {
      //     return NextResponse.json(
      //       { error: "Agent participant not found in the room" },
      //       { status: 404 }
      //     );
      //   }
    }

    await agentDispatchClient.createDispatch(roomName, requestedAgentName, {
      metadata: "my_job_metadata",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error requesting agent:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
