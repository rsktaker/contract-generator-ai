import { tool } from 'ai';
import { z } from 'zod';

/**
 * Contract content generation tool - this will replace the old generateContractText function
 */
export const writeContractTool = tool({
  description: 'Generate comprehensive contract content based on user requirements',
  inputSchema: z.object({
    contractType: z.enum(['service', 'nda', 'employment', 'lease', 'custom']).describe('Type of contract to generate'),
    userPrompt: z.string().describe('User description of what they need in the contract'),
    parties: z.array(z.object({
      name: z.string(),
      role: z.string()
    })).optional().describe('Contract parties if known'),
    isAnonymous: z.boolean().default(false).describe('Whether user is anonymous (use [Your Name] placeholders)')
  }),
  execute: async ({ contractType, userPrompt, parties, isAnonymous }) => {
    // This is a simplified version - in production, this would call an LLM
    // For now, we'll generate a basic template based on contract type
    
    let contractContent = '';
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    
    // Generate basic contract structure based on type
    switch (contractType) {
      case 'service':
        contractContent = generateServiceAgreement(userPrompt, parties, isAnonymous, date);
        break;
      case 'nda':
        contractContent = generateNDAgreement(userPrompt, parties, isAnonymous, date);
        break;
      case 'employment':
        contractContent = generateEmploymentContract(userPrompt, parties, isAnonymous, date);
        break;
      case 'lease':
        contractContent = generateLeaseAgreement(userPrompt, parties, isAnonymous, date);
        break;
      default:
        contractContent = generateCustomContract(userPrompt, parties, isAnonymous, date);
    }
    
    return {
      success: true,
      contractType,
      content: contractContent,
      wordCount: contractContent.split(' ').length,
      generatedAt: new Date().toISOString(),
      message: `Generated ${contractType} contract content`
    };
  }
});

// Helper functions to generate different contract types
function generateServiceAgreement(prompt: string, parties: any[] = [], isAnonymous: boolean, date: string): string {
  const clientName = isAnonymous ? '[Client Name]' : (parties.find(p => p.role === 'client')?.name || '[Client Name]');
  const providerName = isAnonymous ? '[Service Provider Name]' : (parties.find(p => p.role === 'provider')?.name || '[Service Provider Name]');
  
  return `**SERVICE AGREEMENT**

This Service Agreement ("Agreement") is made effective as of ${date}, between ${clientName} ("Client") and ${providerName} ("Service Provider").

**1. SERVICES**
The Service Provider agrees to provide the following services: ${prompt}

**2. PAYMENT TERMS**
- Total compensation: [Amount]
- Payment schedule: [Payment Schedule]
- Late payment fee: [Late Fee]

**3. PROJECT TIMELINE**
- Start date: [Start Date]
- Completion date: [Completion Date]
- Milestones: [Project Milestones]

**4. RESPONSIBILITIES**
The Client agrees to:
- Provide necessary materials and information
- Make payments according to the agreed schedule
- Provide timely feedback and approvals

The Service Provider agrees to:
- Deliver services according to specifications
- Meet agreed-upon deadlines
- Maintain professional standards

**5. INTELLECTUAL PROPERTY**
All work products created under this Agreement shall be owned by [IP Owner].

**6. TERMINATION**
Either party may terminate this Agreement with [Notice Period] written notice.

**7. LIMITATION OF LIABILITY**
Service Provider's liability shall not exceed the total amount paid under this Agreement.

**8. GOVERNING LAW**
This Agreement shall be governed by the laws of [Jurisdiction].`;
}

function generateNDAgreement(prompt: string, parties: any[] = [], isAnonymous: boolean, date: string): string {
  const party1 = isAnonymous ? '[Party 1 Name]' : (parties[0]?.name || '[Party 1 Name]');
  const party2 = isAnonymous ? '[Party 2 Name]' : (parties[1]?.name || '[Party 2 Name]');
  
  return `**NON-DISCLOSURE AGREEMENT**

This Non-Disclosure Agreement ("Agreement") is made effective as of ${date}, between ${party1} ("Disclosing Party") and ${party2} ("Receiving Party").

**1. PURPOSE**
The purpose of this Agreement is to protect confidential information related to: ${prompt}

**2. CONFIDENTIAL INFORMATION**
Confidential Information includes but is not limited to:
- Business plans and strategies
- Financial information
- Technical data and specifications
- Customer lists and information
- [Additional Confidential Information]

**3. OBLIGATIONS OF RECEIVING PARTY**
The Receiving Party agrees to:
- Keep all Confidential Information strictly confidential
- Not disclose Confidential Information to third parties
- Use Confidential Information solely for the agreed purpose
- Return or destroy Confidential Information upon request

**4. EXCEPTIONS**
This Agreement does not apply to information that:
- Is publicly available
- Was known to Receiving Party before disclosure
- Is independently developed
- Is required to be disclosed by law

**5. TERM**
This Agreement shall remain in effect for [Duration] years from the date of execution.

**6. REMEDIES**
Breach of this Agreement may result in irreparable harm, and the Disclosing Party shall be entitled to injunctive relief.

**7. GOVERNING LAW**
This Agreement shall be governed by the laws of [Jurisdiction].`;
}

function generateEmploymentContract(prompt: string, parties: any[] = [], isAnonymous: boolean, date: string): string {
  const employer = isAnonymous ? '[Employer Name]' : (parties.find(p => p.role === 'employer')?.name || '[Employer Name]');
  const employee = isAnonymous ? '[Employee Name]' : (parties.find(p => p.role === 'employee')?.name || '[Employee Name]');
  
  return `**EMPLOYMENT CONTRACT**

This Employment Agreement ("Agreement") is made effective as of ${date}, between ${employer} ("Employer") and ${employee} ("Employee").

**1. POSITION AND DUTIES**
Employee is hired for the position of: ${prompt}

**2. COMPENSATION**
- Base salary: [Annual Salary]
- Payment frequency: [Payment Schedule]
- Benefits: [Benefits Package]

**3. WORK SCHEDULE**
- Hours: [Work Hours]
- Days: [Work Days]
- Location: [Work Location]

**4. EMPLOYMENT TERM**
This is [Employment Type] employment beginning on [Start Date].

**5. CONFIDENTIALITY**
Employee agrees to maintain confidentiality of all proprietary information.

**6. NON-COMPETE**
Employee agrees not to compete with Employer's business for [Non-Compete Period] after termination.

**7. TERMINATION**
Either party may terminate this Agreement with [Notice Period] written notice.

**8. GOVERNING LAW**
This Agreement shall be governed by the laws of [Jurisdiction].`;
}

function generateLeaseAgreement(prompt: string, parties: any[] = [], isAnonymous: boolean, date: string): string {
  const landlord = isAnonymous ? '[Landlord Name]' : (parties.find(p => p.role === 'landlord')?.name || '[Landlord Name]');
  const tenant = isAnonymous ? '[Tenant Name]' : (parties.find(p => p.role === 'tenant')?.name || '[Tenant Name]');
  
  return `**LEASE AGREEMENT**

This Lease Agreement ("Agreement") is made effective as of ${date}, between ${landlord} ("Landlord") and ${tenant} ("Tenant").

**1. PROPERTY**
Property address: [Property Address]
Description: ${prompt}

**2. LEASE TERM**
- Start date: [Lease Start Date]
- End date: [Lease End Date]
- Term length: [Lease Duration]

**3. RENT**
- Monthly rent: [Monthly Rent Amount]
- Due date: [Rent Due Date]
- Late fee: [Late Fee Amount]
- Security deposit: [Security Deposit]

**4. USE OF PROPERTY**
The property shall be used solely for [Property Use].

**5. UTILITIES**
Tenant is responsible for: [Tenant Utilities]
Landlord is responsible for: [Landlord Utilities]

**6. MAINTENANCE**
- Tenant responsibilities: [Tenant Maintenance]
- Landlord responsibilities: [Landlord Maintenance]

**7. TERMINATION**
This lease may be terminated with [Notice Period] written notice.

**8. GOVERNING LAW**
This Agreement shall be governed by the laws of [Jurisdiction].`;
}

function generateCustomContract(prompt: string, parties: any[] = [], isAnonymous: boolean, date: string): string {
  const party1 = isAnonymous ? '[Party 1 Name]' : (parties[0]?.name || '[Party 1 Name]');
  const party2 = isAnonymous ? '[Party 2 Name]' : (parties[1]?.name || '[Party 2 Name]');
  
  return `**CONTRACT AGREEMENT**

This Agreement is made effective as of ${date}, between ${party1} ("Party 1") and ${party2} ("Party 2").

**1. PURPOSE**
The purpose of this Agreement is: ${prompt}

**2. TERMS AND CONDITIONS**
[Specific Terms and Conditions]

**3. OBLIGATIONS**
Party 1 agrees to: [Party 1 Obligations]
Party 2 agrees to: [Party 2 Obligations]

**4. COMPENSATION**
Payment terms: [Payment Terms]

**5. DURATION**
This Agreement shall be effective from [Start Date] to [End Date].

**6. TERMINATION**
This Agreement may be terminated: [Termination Conditions]

**7. GOVERNING LAW**
This Agreement shall be governed by the laws of [Jurisdiction].`;
}