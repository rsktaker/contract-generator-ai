import { NextRequest, NextResponse } from "next/server";
import { tools } from "@/lib/tools";
import Contract from "@/models/Contract";
import { connectToDatabase } from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import User from "@/models/User";

// Background contract generation function
async function generateContractInBackground(
  contractId: any, 
  userPrompt: string, 
  contractType: string, 
  isAnonymous: boolean, 
  userName: string
) {
  try {
    console.log('[CONTRACT-GENERATE-BG] Starting background generation for:', contractId);
    
    // Generate contract using writeContractTool
    const contractContent = await tools.writeContractTool.execute({
      contractType,
      userPrompt
    });
    
    console.log('[CONTRACT-GENERATE-BG] Generated contract length:', contractContent?.length || 0);
    
    // Extract title from first line of generated contract
    const firstLine = contractContent.split('\n')[0]?.replace(/^\**/, '') || 'Generated Contract';
    const contractTitle = firstLine
      .replace(/^Here.*?generated\s*/i, '')
      .replace(/^Here.*?is\s*/i, '')
      .replace(/^The\s+/i, '')
      .replace(/\s+with.*$/i, '')
      .replace(/\*\*/g, '')
      .trim() || 'Generated Contract';

    // Create final contract JSON structure
    const finalContractJson = {
      title: contractTitle,
      type: contractType,
      parties: [
        { name: isAnonymous ? '[Your Name]' : userName, role: 'Party 1', signed: false, signatureId: null },
        { name: '[Other Party Name]', role: 'Party 2', signed: false, signatureId: null }
      ],
      blocks: [
        {
          text: contractContent,
          signatures: []
        }
      ],
      unknowns: []
    };

    // Update the contract in database with final content
    await Contract.findByIdAndUpdate(contractId, {
      title: finalContractJson.title,
      content: JSON.stringify(finalContractJson),
      parties: finalContractJson.parties,
      status: "draft" // Change from "generating" to "draft"
    });

    console.log('[CONTRACT-GENERATE-BG] Contract updated with final content:', contractId);

  } catch (error) {
    console.error('[CONTRACT-GENERATE-BG] Error in background generation:', error);
    
    // Update contract status to error
    await Contract.findByIdAndUpdate(contractId, {
      status: "error",
      title: "Contract Generation Failed"
    }).catch(err => console.error('[CONTRACT-GENERATE-BG] Failed to update error status:', err));
  }
}

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

    // Determine contract type from prompt
    const contractType = userPrompt.toLowerCase().includes('nda') ? 'nda' : 
                        userPrompt.toLowerCase().includes('service') ? 'service' : 'custom';
    
    // Create placeholder contract JSON structure
    const placeholderContractJson = {
      title: "Generating Contract...",
      type: contractType,
      parties: [
        { name: isAnonymous ? '[Your Name]' : userName, role: 'Party 1', signed: false, signatureId: null },
        { name: '[Other Party Name]', role: 'Party 2', signed: false, signatureId: null }
      ],
      blocks: [
        {
          text: "Contract is being generated...",
          signatures: []
        }
      ],
      unknowns: []
    };

    // Save to database immediately with placeholder content
    console.log('[CONTRACT-GENERATE] Creating contract record with placeholder content...');
    const contract = await Contract.create({
      userId: userId,
      title: placeholderContractJson.title,
      type: placeholderContractJson.type || "custom",
      requirements: prompt,
      content: JSON.stringify(placeholderContractJson),
      parties: placeholderContractJson.parties || [],
      status: "draft", // Use draft status
      isAnonymous: isAnonymous,
      generatedAt: new Date()
    });

    console.log('[CONTRACT-GENERATE] Contract record created with ID:', contract._id);

    // Start contract generation in background (don't await)
    generateContractInBackground(contract._id, userPrompt, contractType, isAnonymous, userName)
      .catch(error => {
        console.error('[CONTRACT-GENERATE] Background generation failed:', error);
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
