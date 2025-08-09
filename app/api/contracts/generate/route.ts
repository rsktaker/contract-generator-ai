import { NextRequest, NextResponse } from "next/server";
import { tools } from "@/lib/tools";
import Contract from "@/models/Contract";
import { connectToDatabase } from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import User from "@/models/User";

// Contract generation function
async function generateContract(
  contractId: any, 
  userPrompt: string, 
  contractType: string, 
  isAnonymous: boolean, 
  userName: string
) {
  try {
    console.log('[CONTRACT-GENERATE-BG] Starting background generation for:', contractId);
    console.log('[CONTRACT-GENERATE-BG] User prompt:', userPrompt);
    console.log('[CONTRACT-GENERATE-BG] Contract type:', contractType);
    
    // Ensure database connection
    await connectToDatabase();
    
    // Generate contract using writeContractTool
    if (!tools.writeContractTool || !tools.writeContractTool.execute) {
      console.error('[CONTRACT-GENERATE-BG] writeContractTool is not available');
      throw new Error('writeContractTool is not available');
    }
    
    console.log('[CONTRACT-GENERATE-BG] Calling writeContractTool...');
    const contractContent = await tools.writeContractTool.execute(
      {
        contractType,
        userPrompt
      },
      {
        toolCallId: "",
        messages: []
      } // Provide an empty options object or appropriate options
    );
    console.log('[CONTRACT-GENERATE-BG] writeContractTool completed');
    
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
    console.log('[CONTRACT-GENERATE-BG] Updating contract in database...');
    const updateResult = await Contract.findByIdAndUpdate(contractId, {
      title: finalContractJson.title,
      content: JSON.stringify(finalContractJson),
      parties: finalContractJson.parties,
      status: "draft" // Change from "generating" to "draft"
    });
    
    console.log('[CONTRACT-GENERATE-BG] Contract updated with final content:', contractId);
    console.log('[CONTRACT-GENERATE-BG] Update result:', updateResult ? 'success' : 'failed');

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
  console.log('[CONTRACT-GENERATE] Starting POST request...');
  try {
    console.log('[CONTRACT-GENERATE] Connecting to database...');
    await connectToDatabase();
    console.log('[CONTRACT-GENERATE] Database connected successfully');

    // Get the session to check if user is authenticated
    console.log('[CONTRACT-GENERATE] Getting user session...');
    const session = await getServerSession(authOptions);
    console.log('[CONTRACT-GENERATE] Session:', session ? 'authenticated' : 'anonymous');
    let userId: string;
    let userName: string;

    if (!session || !session.user || !session.user.id) {
      // Create anonymous user for unauthenticated requests
      console.log('[CONTRACT-GENERATE] Creating anonymous user...');
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
    console.log('[CONTRACT-GENERATE] Parsing request body...');
    const body = await request.json();
    const { prompt, contractId } = body;
    console.log('[CONTRACT-GENERATE] Prompt:', prompt);
    console.log('[CONTRACT-GENERATE] Contract ID:', contractId);

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    let contract;
    
    if (contractId) {
      // Use existing contract (from create endpoint)
      console.log('[CONTRACT-GENERATE] Using existing contract ID:', contractId);
      contract = await Contract.findById(contractId);
      if (!contract) {
        return NextResponse.json(
          { error: "Contract not found" },
          { status: 404 }
        );
      }
    } else {
      // Create new contract (legacy flow)
      console.log('[CONTRACT-GENERATE] Creating new contract...');
      
      // Generate contract using the new simplified approach
      const isAnonymous = userName === "Anonymous User";
      const contractType = prompt.toLowerCase().includes('nda') ? 'nda' : 
                          prompt.toLowerCase().includes('service') ? 'service' : 'custom';
      
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

      contract = await Contract.create({
        userId: userId,
        title: placeholderContractJson.title,
        type: placeholderContractJson.type || "custom",
        requirements: prompt,
        content: JSON.stringify(placeholderContractJson),
        parties: placeholderContractJson.parties || [],
        status: "generating",
        isAnonymous: userName === "Anonymous User",
        generatedAt: new Date()
      });
    }

    console.log('[CONTRACT-GENERATE] Working with contract ID:', contract._id);

    // Prepare generation variables
    const isAnonymous = userName === "Anonymous User";
    const userPrompt = isAnonymous 
      ? `The user is anonymous. Use bracketed placeholders like [Your Name] for unknown information. ${prompt}`
      : `User's name: ${userName}. ${prompt}`;
    const contractType = prompt.toLowerCase().includes('nda') ? 'nda' : 
                        prompt.toLowerCase().includes('service') ? 'service' : 'custom';

    // Start generation immediately (synchronous)
    console.log('[CONTRACT-GENERATE] Starting synchronous contract generation...');
    await generateContract(contract._id, userPrompt, contractType, isAnonymous, userName);
    console.log('[CONTRACT-GENERATE] Contract generation completed');

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
