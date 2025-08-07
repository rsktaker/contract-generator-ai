import { tool } from 'ai';
import { z } from 'zod';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

export const writeContractTool = tool({
  description: `Generate legally compliant business contracts with proper structure and formatting. 

LEGAL COMPLIANCE: Follows comprehensive business legal document standards including essential structure requirements, mandatory legal elements, and professional formatting standards necessary for generating legally enforceable documents across US business jurisdictions.

SUPPORTED CONTRACT TYPES & REQUIRED STRUCTURES:
• NDAs (9 core sections): Header, Parties, Purpose, Confidential Information Definition, Exclusions, Receiving Party Obligations, Term/Duration, Remedies, General Provisions
• Service Agreements (12 core sections): Header, Parties, Term, Services, Compensation, Independent Contractor Status, IP Rights, Confidentiality, Liability, Termination, General Provisions, Signatures  
• Employment Contracts (15 core sections): Header, Parties, Position, Duties, Term, Compensation, Benefits, Work Schedule, Confidentiality, IP Rights, Post-Employment Restrictions, Termination, Dispute Resolution, General Provisions, Signatures

MANDATORY LEGAL ELEMENTS:
• Party Identification: Full legal names, addresses, business entity types
• Specific Definitions: Clear boundaries for confidential information, services, deliverables
• Standard Legal Protections: Exclusions clauses, liability limitations, governing law
• Professional Language: Industry-standard legal terminology and phrasing
• Risk Mitigation: Appropriate remedies, termination conditions, dispute resolution

FORMATTING STANDARDS: Professional layout with 1.5" left margins, **bold section headings**, numbered sections, proper signature blocks, and variable field placeholders using [BRACKET] format for user completion. IMPORTANT: Make the first line/title center aligned.`,
  inputSchema: z.object({ 
    contractType: z.string().describe('Type of contract (nda, service, employment, partnership, licensing, custom, etc.)'),
    userPrompt: z.string().describe('User description of contract needs and specific requirements')
  }),
  execute: async ({ contractType, userPrompt }) => {
    console.log(`[WRITE-CONTRACT-TOOL] Generating ${contractType} contract for: ${userPrompt}`);
    
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    try {
      // Generate the contract dynamically using AI
      const result = await generateText({
        model: openai('gpt-4o'),
        system: `You are a professional contract generation expert with comprehensive knowledge of US business law and legal document standards.

🏛️ LEGAL COMPLIANCE REQUIREMENTS:
Generate contracts that meet federal and state legal standards with proper structure, mandatory elements, and professional formatting for enforceability across US business jurisdictions.

📋 CONTRACT-SPECIFIC STRUCTURAL REQUIREMENTS:

**Non-Disclosure Agreements (NDAs) - 9 Core Sections:**
1. **Header**: "Non-Disclosure Agreement" or "Confidentiality Agreement"
2. **Parties**: Full legal identification of Disclosing and Receiving Parties
3. **Purpose**: Clear reason for information disclosure  
4. **Confidential Information Definition**: Comprehensive definition with specific examples
5. **Exclusions**: Standard legal exceptions (publicly known, independently developed, legally compelled)
6. **Receiving Party Obligations**: Specific duties, restrictions, and confidentiality requirements
7. **Term/Duration**: Definite time period or nature-based duration
8. **Remedies**: Injunctive relief provisions due to irreparable harm potential
9. **General Provisions**: Severability, integration clause, governing law selection

**Service Agreements - 12 Core Sections:**
1. **Header**: "Service Agreement" or "Professional Services Agreement"
2. **Parties**: Service Provider and Client full identification
3. **Term**: Duration, start/end dates, renewal options
4. **Services**: Detailed scope of work with specific deliverables and acceptance criteria
5. **Compensation**: Payment terms, rates, expense handling, collection procedures
6. **Independent Contractor Status**: Clear classification to avoid employment law issues
7. **Intellectual Property**: Work product ownership and licensing rights specification
8. **Confidentiality**: Proprietary information protection clauses
9. **Liability and Indemnification**: Risk allocation and limitation provisions
10. **Termination**: Notice requirements, cause definitions, post-termination obligations
11. **General Provisions**: Governing law, dispute resolution, integration
12. **Signature Block**: Proper execution format with titles and dates

**Employment Contracts - 15 Core Sections:**
1. **Header**: "Employment Agreement"
2. **Parties**: Employer and Employee full identification
3. **Position**: Job title, department, reporting structure
4. **Duties**: Detailed responsibilities and performance expectations
5. **Term**: At-will status or fixed duration with state-compliant language
6. **Compensation**: Base salary, bonus structure, overtime compliance
7. **Benefits**: Health, retirement, vacation, sick leave entitlements
8. **Work Schedule**: Hours, location, travel requirements
9. **Confidentiality**: Proprietary information protection
10. **Intellectual Property**: Work-related creation ownership rights
11. **Post-Employment Restrictions**: Non-compete and non-solicitation (jurisdiction-compliant)
12. **Termination**: Notice periods, cause definitions, severance terms
13. **Dispute Resolution**: Arbitration or litigation procedures
14. **General Provisions**: Integration, modification procedures, compliance references
15. **Signature Block**: Employee and employer proper execution

⚖️ MANDATORY LEGAL ELEMENTS (ALL CONTRACT TYPES):
- **Party Identification**: Full legal names, business addresses, entity types
- **Consideration**: Clear value exchange or benefit specification
- **Legal Capacity**: Ensure parties have authority to enter agreements
- **Standard Legal Language**: Industry-appropriate terminology and phrasing
- **Governing Law**: Jurisdiction selection for dispute resolution
- **Severability Clause**: Contract remains valid if portions are unenforceable
- **Integration Clause**: This agreement supersedes all prior agreements

📝 PROFESSIONAL FORMATTING STANDARDS:
- **Document Layout**: Professional margins (1.5" left, 1" right, top, bottom)
- **Typography**: Clear, readable font with **bold section headings**
- **Structure**: Numbered sections (1., 2., 3.) with logical flow
- **Signature Blocks**: Proper format with entity names, individual signatures, titles, dates
- **Page Layout**: Professional appearance meeting business and court standards

🔤 VARIABLE FIELD REQUIREMENTS:
Use standardized [BRACKETED] placeholders for user completion:
- Party Information: [Your Name], [Other Party Name], [Company Name], [Business Address]
- Dates: [Effective Date], [Expiration Date], [Duration Period], [Termination Date]
- Financial: [Amount], [Payment Terms], [Salary], [Bonus Structure], [Expense Limit]
- Legal: [State/Jurisdiction], [Governing Law State], [Liability Cap Amount]
- Specific: [Service Description], [Deliverables], [Job Title], [Department], [Confidential Information Categories]

⚠️ RISK MITIGATION REQUIREMENTS:
- Include appropriate liability limitations and damage remedies
- Add standard exclusions for legally compelled disclosures
- Ensure enforceability through reasonable scope and duration limits
- Include proper termination and dispute resolution procedures
- Reference applicable employment law compliance where required

📊 OUTPUT REQUIREMENTS:
- START IMMEDIATELY with contract title (no introductory text)
- END with final contract provision (no explanatory text after)
- Generate complete, ready-to-use legal document
- Professional legal language throughout
- All mandatory sections for contract type included
- Proper legal structure and clause organization

Current Date: ${currentDate}
Contract Type: ${contractType}
User Requirements: ${userPrompt}`,
        prompt: `Generate a complete ${contractType} contract based on these requirements: ${userPrompt}

The contract should be professional, legally sound, and include all necessary clauses for this type of agreement. Use bracketed placeholders for specific information that would need to be filled in.`,
        temperature: 0.2,
      });

      console.log(`[WRITE-CONTRACT-TOOL] Generated contract length: ${result.text.length}`);
      return result.text;

    } catch (error) {
      console.error('[WRITE-CONTRACT-TOOL] Error generating contract:', error);
      throw error;
    }
  }
});