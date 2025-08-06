import { NextRequest, NextResponse } from "next/server";
import { tools } from "@/lib/tools";
import Contract from "@/models/Contract";
import { connectToDatabase } from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import User from "@/models/User";

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
        googleId: `anonymous-${Date.now()}`, // Add googleId to bypass password requirement
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
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      userId = session.user.id;
      userName = user.name;
    }

    // Get the prompt from the request body
    const body = await request.json();
    const { prompt } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // Generate contract using the new simplified approach
    const isAnonymous = userName === "Anonymous User";
    const userPrompt = isAnonymous 
      ? `The user is anonymous. Use bracketed placeholders like [Your Name] for unknown information. ${prompt}`
      : `User's name: ${userName}. ${prompt}`;

    // Generate contract using writeContractTool directly
    console.log('[CONTRACT-GENERATE] Calling writeContractTool with prompt:', userPrompt);
    
    // Determine contract type from prompt
    const contractType = userPrompt.toLowerCase().includes('nda') ? 'nda' : 
                        userPrompt.toLowerCase().includes('service') ? 'service' : 'custom';
    
    const contractContent = await tools.writeContractTool.execute({
      contractType,
      userPrompt
    });
    
    console.log('[CONTRACT-GENERATE] Generated contract length:', contractContent?.length || 0);
    
    // Extract title from first line of generated contract
    const firstLine = contractContent.split('\n')[0]?.replace(/^\**/, '') || 'Generated Contract';
    const contractTitle = firstLine
      .replace(/^Here.*?generated\s*/i, '')
      .replace(/^Here.*?is\s*/i, '')
      .replace(/^The\s+/i, '')
      .replace(/\s+with.*$/i, '')
      .replace(/\*\*/g, '')
      .trim() || 'Generated Contract';

    // Create contract data structure from the agent result
    const contractData = {
      title: contractTitle,
      content: contractContent,
      parties: [
        { name: isAnonymous ? '[Your Name]' : userName, role: 'Party 1' },
        { name: '[Other Party Name]', role: 'Party 2' }
      ]
    };

    // XXX: Define a new schema so the database can store the new contract data better.
    const contractJson = {
      title: contractData.title,
      type: "custom",
      parties: contractData.parties.map(party => ({
        ...party,
        signed: false,
        signatureId: null
      })),
      blocks: [
        {
          text: contractData.content,
          signatures: []
        }
      ],
      unknowns: contractData.unknowns
    };

    // Save to database with the user's ID (authenticated or anonymous)
    const contract = await Contract.create({
      userId: userId,
      title: contractJson.title,
      type: contractJson.type || "custom",
      requirements: prompt,
      content: JSON.stringify(contractJson),
      parties: contractJson.parties || [],
      status: "draft",
      isAnonymous: isAnonymous,
      generatedAt: new Date()
    });

    // Increment the user's contract count
    await User.findByIdAndUpdate(userId, {
      $inc: { contractsCreated: 1 },
    });

    return NextResponse.json({ contract }, { status: 201 });
  } catch (error) {
    console.error("Error generating contract:", error);
    return NextResponse.json(
      { error: "Failed to generate contract" },
      { status: 500 }
    );
  }
}
