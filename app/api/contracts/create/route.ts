import { NextRequest, NextResponse } from "next/server";
import Contract from "@/models/Contract";
import { connectToDatabase } from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import User from "@/models/User";

export async function POST(request: NextRequest) {
  console.log('[CONTRACT-CREATE] Starting POST request...');
  try {
    console.log('[CONTRACT-CREATE] Connecting to database...');
    await connectToDatabase();
    console.log('[CONTRACT-CREATE] Database connected successfully');

    // Get the session to check if user is authenticated
    console.log('[CONTRACT-CREATE] Getting user session...');
    const session = await getServerSession(authOptions);
    console.log('[CONTRACT-CREATE] Session:', session ? 'authenticated' : 'anonymous');
    let userId: string;
    let userName: string;

    if (!session || !session.user || !session.user.id) {
      // Create anonymous user for unauthenticated requests
      console.log('[CONTRACT-CREATE] Creating anonymous user...');
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
    console.log('[CONTRACT-CREATE] Parsing request body...');
    const body = await request.json();
    const { prompt } = body;
    console.log('[CONTRACT-CREATE] Prompt:', prompt);

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

    // Save to database with generating status first
    console.log('[CONTRACT-CREATE] Creating contract record with generating status...');
    const contract = await Contract.create({
      userId: userId,
      title: placeholderContractJson.title,
      type: placeholderContractJson.type || "custom",
      requirements: prompt,
      content: JSON.stringify(placeholderContractJson),
      parties: placeholderContractJson.parties || [],
      status: "generating", // Use generating status initially
      isAnonymous: isAnonymous,
      generatedAt: new Date()
    });

    console.log('[CONTRACT-CREATE] Contract record created with ID:', contract._id);

    // Return immediately - generation will happen via separate call
    return NextResponse.json({ contract }, { status: 201 });
  } catch (error) {
    console.error("Error creating contract:", error);
    return NextResponse.json(
      { error: "Failed to create contract" },
      { status: 500 }
    );
  }
}