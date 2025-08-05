import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Simplified contract structure
interface ContractData {
  title: string;
  text: string;
  unknowns: string[];
  // XXX: Parties are definitely not needed.
  parties: {
    name: string;
    email?: string;
    role: string;
  }[];
}

// Generate contract title
export async function generateContractTitle(userPrompt: string): Promise<string> {
  const systemPrompt = `You are a contract generation assistant. Generate a brief, professional contract title based on the user's requirements.

CRITICAL REQUIREMENTS:
1. Do NOT wrap the title in quotes
2. Do NOT include party names, dates, or specific details in the title
3. Keep it short and generic - just the contract type
4. Follow these exact examples format:
   - NON-DISCLOSURE AGREEMENT
   - SERVICE AGREEMENT 
   - EMPLOYMENT CONTRACT
   - LEASE AGREEMENT
   - PARTNERSHIP AGREEMENT

Return only the title, nothing else. Keep it short and professional.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1, // Lower temperature for more consistent output
      max_tokens: 50
    });

    return completion.choices[0]?.message?.content?.trim() || 'CONTRACT AGREEMENT';
  } catch (error) {
    console.error('Error generating contract title:', error);
    return 'CONTRACT AGREEMENT';
  }
}

// Generate contract text (main content)
export async function generateContractText(userPrompt: string): Promise<string> {
  const systemPrompt = `You are a professional contract lawyer. Generate a comprehensive, legally sound contract based on the user's requirements.

CRITICAL REQUIREMENTS:
1. Write in clear, professional legal language
2. Include all necessary legal clauses and protections
3. Use standard contract formatting with clear sections and numbered clauses where appropriate
4. Do NOT include any concluding statements, ending phrases like [End of Document], or final clauses like "IN WITNESS WHEREOF..."
5. Do NOT include signature blocks - those will be added separately
6. Be extremely comfortable requesting information by explicitly bracketing unknowns (eg. [Date], [Amount], [Name], [Email], etc.). Do not create information that is not included in the user prompt.
7. Do NOT include a title at the beginning - the title is handled separately
8. Use **bold text** for section headings
9. Focus on the meat of the contract - the actual terms and conditions`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2, // Lower temperature for more consistent output
      max_tokens: 2000
    });

    return completion.choices[0]?.message?.content?.trim() || '';
  } catch (error) {
    console.error('Error generating contract text:', error);
    throw new Error('Failed to generate contract text');
  }
}

// XXX: Simply replace this with a hardcoded regex that finds bracketed unknowns and returns them as an array.
// Potentially you can also find the index of where they're at in the text so you can render them as special divs that can be clicked and filled in?
export async function extractUnknowns(contractText: string): Promise<string[]> {
  const systemPrompt = `You are analyzing a contract to identify unknown variables that need to be filled in.

Look for:
- Dates (completion dates, start dates, etc.)
- Amounts (prices, fees, salaries, etc.)
- Jurisdictions (state, country laws)
- Specific terms that are placeholders
- Any [BRACKETED] or ___UNDERSCORED___ text

Return a JSON array of strings representing the unknowns found. If none found, return empty array [].

Examples:
["Completion Date", "Total Amount", "Jurisdiction", "Payment Schedule"]`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: contractText }
      ],
      temperature: 0.1,
      max_tokens: 200
    });

    const response = completion.choices[0]?.message?.content?.trim();
    if (!response) return [];

    // Parse JSON response
    try {
      return JSON.parse(response);
    } catch {
      // Fallback: extract common patterns
      const unknowns: string[] = [];
      const patterns = [
        /\[([^\]]+)\]/g,
        /___([^_]+)___/g,
        /__([^_]+)__/g,
        /Date:?\s*[A-Za-z\s]+/gi,
        /Amount:?\s*\$?[A-Za-z\s]+/gi,
        /Jurisdiction:?\s*[A-Za-z\s]+/gi
      ];

      patterns.forEach(pattern => {
        const matches = response.match(pattern);
        if (matches) {
          matches.forEach(match => {
            const clean = match.replace(/[\[\]___]/g, '').trim();
            if (clean && !unknowns.includes(clean)) {
              unknowns.push(clean);
            }
          });
        }
      });

      return unknowns;
    }
  } catch (error) {
    console.error('Error extracting unknowns:', error);
    return [];
  }
}

// XXX: This is ridiculous and uneccessary.
export async function extractParties(contractText: string): Promise<{ name: string; email?: string; role: string }[]> {
  const systemPrompt = `You are analyzing a contract to identify the parties involved.

Extract all parties mentioned in the contract and their roles. Look for:
- Company names
- Individual names
- Their roles (Client, Service Provider, Employer, Employee, etc.)
- Email addresses if mentioned

Return a JSON array of objects with this structure:
[
  {
    "name": "Full Name or Company Name",
    "email": "email@example.com" (if found, otherwise null),
    "role": "Their role in the contract"
  }
]`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: contractText }
      ],
      temperature: 0.1,
      max_tokens: 300
    });

    const response = completion.choices[0]?.message?.content?.trim();
    if (!response) return [];

    try {
      return JSON.parse(response);
    } catch {
      // Fallback: return basic party structure
      return [
        { name: "Party A", role: "Primary Party" },
        { name: "Party B", role: "Counterparty" }
      ];
    }
  } catch (error) {
    console.error('Error extracting parties:', error);
    return [
      { name: "Party A", role: "Primary Party" },
      { name: "Party B", role: "Counterparty" }
    ];
  }
}

// Main function to generate complete contract data
export async function generateContractData(userPrompt: string): Promise<ContractData> {
  try {
    // Generate title and text in parallel for speed
    const [title, text] = await Promise.all([
      generateContractTitle(userPrompt),
      generateContractText(userPrompt)
    ]);

    // Extract unknowns and parties in parallel
    const [unknowns, parties] = await Promise.all([
      extractUnknowns(text),
      extractParties(text)
    ]);

    return {
      title,
      text,
      unknowns,
      parties
    };
  } catch (error) {
    console.error('Error generating contract data:', error);
    throw new Error('Failed to generate contract');
  }
}

// Regenerate contract text with user instructions
export async function regenerateContractText(
  originalText: string,
  userInstructions: string
): Promise<string> {
  const systemPrompt = `You are a professional contract lawyer. You need to modify an existing contract based on user instructions.

IMPORTANT:

1. Only modify what the user specifically requests
2. Maintain professional legal language
3. Do NOT include signature blocks

Return the complete modified contract text.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { 
          role: 'user', 
          content: `Original contract:\n\n${originalText}\n\nUser instructions: ${userInstructions}\n\nPlease modify the contract according to the user's instructions.`
        }
      ],
      temperature: 0.4,
      max_tokens: 2000
    });

    return completion.choices[0]?.message?.content?.trim() || originalText;
  } catch (error) {
    console.error('Error regenerating contract text:', error);
    throw new Error('Failed to regenerate contract');
  }
}

// Legacy function for backward compatibility
export async function generateContractJson(userPrompt: string): Promise<any> {
  const contractData = await generateContractData(userPrompt);
  
  // Convert to legacy format for backward compatibility
  return {
    title: contractData.title,
    type: "custom",
    parties: contractData.parties.map(party => ({
      ...party,
      signed: false,
      signatureId: null
    })),
    blocks: [
      {
        text: contractData.text,
        signatures: []
      }
    ],
    unknowns: contractData.unknowns
  };
}

// Legacy regenerate function for backward compatibility
export async function regenerateContract(contractJson: any, userInstructions: string): Promise<any> {
  const originalText = contractJson.blocks?.[0]?.text || '';
  const newText = await regenerateContractText(originalText, userInstructions);
  
  // Extract new unknowns and parties
  const [unknowns, parties] = await Promise.all([
    extractUnknowns(newText),
    extractParties(newText)
  ]);

  return {
    ...contractJson,
    blocks: [
      {
        text: newText,
        signatures: contractJson.blocks?.[0]?.signatures || []
      }
    ],
    unknowns,
    parties: parties.map(party => ({
      ...party,
      signed: false,
      signatureId: null
    }))
  };
}
