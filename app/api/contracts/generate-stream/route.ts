import { NextRequest } from "next/server";
import { tools } from "@/lib/tools";
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

    // Use writeContractTool directly (this route may not be actively used)
    const contractType = prompt.toLowerCase().includes('nda') ? 'nda' : 
                        prompt.toLowerCase().includes('service') ? 'service' : 'custom';
    
    if (!tools.writeContractTool || !tools.writeContractTool.execute) {
      throw new Error("Contract tool is not available");
    }
    
    const contractContent = await tools.writeContractTool.execute(
      {
        contractType,
        userPrompt: prompt
      },
      {
        toolCallId: "",
        messages: []
      } // Provide an empty options object or the appropriate options
    );
    
    // Create and save contract
    const contractTitle = contractContent.split('\n')[0]?.replace(/\*\*/g, '').trim() || 'Generated Contract';
    
    const contract = await Contract.create({
      userId: userId,
      title: contractTitle,
      type: contractType,
      requirements: prompt,
      content: JSON.stringify({
        title: contractTitle,
        type: contractType,
        parties: [
          { name: isAnonymous ? '[Your Name]' : userName, role: 'Party 1' },
          { name: '[Other Party Name]', role: 'Party 2' }
        ],
        blocks: [
          {
            text: contractContent,
            signatures: []
          }
        ]
      }),
      parties: [
        { name: isAnonymous ? '[Your Name]' : userName, role: 'Party 1', signed: false, signatureId: null },
        { name: '[Other Party Name]', role: 'Party 2', signed: false, signatureId: null }
      ],
      status: "draft",
      isAnonymous: isAnonymous,
      generatedAt: new Date()
    });

    // Update user contract count
    await User.findByIdAndUpdate(userId, {
      $inc: { contractsCreated: 1 }
    });

    return Response.json({ contract }, { status: 201 });

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