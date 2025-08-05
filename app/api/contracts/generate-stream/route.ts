import { NextRequest } from "next/server";
import { contractAgent } from "@/lib/agent";
import Contract from "@/models/Contract";
import { connectToDatabase } from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import User from "@/models/User";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

/**
 * New streaming contract generation API route using AI SDK
 * This route provides real-time streaming contract generation
 */
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    // Get the session to check if user is authenticated
    const session = await getServerSession(authOptions);
    let userId: string;
    let userName: string;

    if (!session || !session.user || !session.user.id) {
      // Create anonymous user for unauthenticated requests
      const anonymousUser = await User.create({
        name: "Anonymous User",
        email: `anonymous-${Date.now()}@contractgenerator.ai`,
        googleId: `anonymous-${Date.now()}`,
        role: "user",
        plan: "free",
        contractsCreated: 0,
        planLimits: {
          contractsPerMonth: 5,
          lastResetDate: new Date()
        }
      });
      userId = anonymousUser._id.toString();
      userName = "Anonymous User";
    } else {
      // Use authenticated user
      const user = await User.findById(session.user.id);
      if (!user) {
        return Response.json({ error: "User not found" }, { status: 404 });
      }
      userId = session.user.id;
      userName = user.name;
    }

    // Get the prompt from the request body
    const body = await request.json();
    const { prompt } = body;

    if (!prompt) {
      return Response.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    const isAnonymous = userName === "Anonymous User";

    // Stream the contract generation using AI SDK
    const result = await contractAgent.generateContractStream(prompt, {
      isAnonymous,
      userId,
      userName
    });

    // Return proper UI message stream response
    return result.toUIMessageStreamResponse({
      onFinish: async (options) => {
        console.log('Contract generation finished for user:', userId);
        
        // TODO: Save contract to database when streaming completes
        // This would require collecting the final result from the stream
        try {
          await User.findByIdAndUpdate(userId, {
            $inc: { contractsCreated: 1 }
          });
        } catch (dbError) {
          console.error('Failed to update user contract count:', dbError);
        }
      },
    });

  } catch (error) {
    console.error("Error in generate-stream:", error);
    return Response.json(
      { 
        error: "Failed to generate contract",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}