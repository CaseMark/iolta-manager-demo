/**
 * Extract Matter Information from Document
 *
 * Comprehensive API route that uses AI to extract detailed matter information
 * including transactions, holds, settlement breakdowns, and financial summaries.
 *
 * Supports:
 * - TXT files: Read directly
 * - PDF/DOCX files: OCR via Case.dev API (requires Vercel Blob in production)
 * - Manual text input: Pass textContent in form data
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractStructuredData } from '@/lib/case-dev/client';
import { storeFile, deleteFile, isBlobAvailable } from '@/lib/file-store';
import type { ExtractedMatterInfo, MatterExtractionResponse } from '@/types/extraction';

const CASE_API_BASE = process.env.CASE_API_URL || 'https://api.case.dev';

const EXTRACTION_SCHEMA = `{
  "matterId": "string or null",
  "matterNumber": "string or null",
  "matterName": "string or null",
  "matterType": "Personal Injury | Family Law | Real Estate | Estate Planning | Criminal Defense | Business/Corporate | Employment Law | Immigration | Intellectual Property | Bankruptcy | Medical Malpractice | Workers Compensation | Other | null",
  "description": "string or null",
  "status": "active | pending | settled | closed | null",
  "openDate": "string (YYYY-MM-DD) or null",

  "clientName": "string or null",
  "clientEmail": "string or null",
  "clientPhone": "string or null",
  "clientAddress": "string or null",

  "responsibleAttorney": "string or null",
  "billingAttorney": "string or null",

  "billingType": "hourly | contingency | flat_fee | retainer | null",
  "billingRate": "string or null",
  "contingencyPercentage": "number or null",
  "retainerAmount": "number or null",

  "court": "string or null",
  "courtCaseNumber": "string or null",
  "jurisdiction": "string or null",

  "opposingParty": "string or null",
  "opposingCounsel": "string or null",

  "statuteOfLimitations": "string (YYYY-MM-DD) or null",
  "settlementDate": "string (YYYY-MM-DD) or null",
  "trialDate": "string (YYYY-MM-DD) or null",

  "settlementAmount": "number or null",
  "settlementBreakdown": {
    "grossSettlement": "number or null",
    "attorneyFees": "number or null",
    "attorneyFeePercentage": "number or null",
    "caseCosts": "number or null",
    "caseCostItems": [{"description": "string", "amount": "number"}],
    "medicalLiensTotal": "number or null",
    "medicalLienItems": [{"creditor": "string", "originalAmount": "number", "negotiatedAmount": "number", "savings": "number"}],
    "subrogationTotal": "number or null",
    "subrogationItems": [{"creditor": "string", "originalAmount": "number", "negotiatedAmount": "number", "savings": "number"}],
    "clientDistribution": "number or null",
    "structuredSettlementAmount": "number or null",
    "pendingLiens": "number or null",
    "pendingLienDescription": "string or null"
  },

  "financialSummary": {
    "trustBalance": "number or null",
    "totalDeposits": "number or null",
    "totalDisbursements": "number or null",
    "activeHolds": "number or null",
    "availableBalance": "number or null"
  },

  "transactions": [{
    "transactionId": "string or null",
    "date": "string (YYYY-MM-DD) or null",
    "type": "deposit | disbursement",
    "category": "settlement_funds | legal_fees | case_costs | medical_lien | subrogation | client_distribution | structured_settlement | retainer | refund | other",
    "description": "string",
    "amount": "number",
    "payee": "string or null",
    "payor": "string or null",
    "paymentMethod": "string or null",
    "checkNumber": "string or null",
    "reference": "string or null",
    "balanceAfter": "number or null",
    "recordedBy": "string or null",
    "approvedBy": "string or null",
    "originalAmount": "number or null",
    "negotiatedAmount": "number or null",
    "savings": "number or null"
  }],

  "holds": [{
    "holdId": "string or null",
    "status": "active | released | partial",
    "holdType": "lien_reserve | structured_settlement | attorney_lien | escrow | compliance | retainer | other",
    "amount": "number",
    "description": "string",
    "createdDate": "string (YYYY-MM-DD) or null",
    "createdBy": "string or null",
    "expectedReleaseDate": "string (YYYY-MM-DD) or null",
    "releaseConditions": "string or null",
    "releasedDate": "string (YYYY-MM-DD) or null",
    "releasedBy": "string or null",
    "notes": "string or null"
  }],

  "confidence": {
    "overall": "high | medium | low",
    "fields": {}
  }
}`;

const EXTRACTION_INSTRUCTIONS = `You are an expert legal document analyst specializing in IOLTA (Interest on Lawyer Trust Accounts) and matter management. Extract comprehensive information from the provided legal document.

## Document Types You May Encounter:
- Matter summaries and case reports
- Settlement statements and breakdowns
- Trust account ledgers
- Transaction histories
- Client ledger reports
- Case intake forms
- Engagement letters
- Settlement agreements

## MATTER INFORMATION

### Basic Information
- **matterId/matterNumber**: Look for IDs like "MAT-2024-006", "2024-PI-0412", file numbers
- **matterName**: The case caption or matter title (e.g., "Rodriguez v. Apex Settlement")
- **matterType**: Classify based on content:
  - "Personal Injury": Accidents, injuries, medical malpractice
  - "Family Law": Divorce, custody, adoption
  - "Real Estate": Property transactions, closings
  - "Estate Planning": Wills, trusts, probate
  - "Workers Compensation": Workplace injuries with WC claims
  - Use other types as appropriate
- **status**: Determine from context (active, pending, settled, closed)

### Client Information
- Extract client name from salutations, party names, distribution payees
- Look for contact info in headers, signatures

### Attorney Information
- **responsibleAttorney**: Primary attorney handling matter
- **billingAttorney**: May be same or different
- Look in signatures, letterheads, "Recorded By" fields

### Billing Information
- **billingType**: "contingency" if percentage-based fees, "hourly" if rate mentioned, "flat_fee" if fixed amount
- **contingencyPercentage**: Extract the percentage (e.g., 33% = 33)
- **retainerAmount**: Initial deposit required

### Court/Case Information
- **court**: Full court name
- **courtCaseNumber**: Official case number
- **opposingParty**: Defendant/Plaintiff on other side
- **opposingCounsel**: Attorney/firm representing opposing party

### Important Dates
- Convert all dates to YYYY-MM-DD format
- **statuteOfLimitations**: Deadline for filing
- **settlementDate**: When case was settled
- **trialDate**: If scheduled

## SETTLEMENT BREAKDOWN

For settled cases, extract the detailed breakdown:
- **grossSettlement**: Total settlement amount before deductions
- **attorneyFees**: Fee amount (calculate from percentage if needed)
- **caseCosts**: Total costs advanced, with itemized breakdown
- **medicalLiens**: Amounts paid to medical providers, noting original vs negotiated amounts
- **subrogation**: Insurance reimbursements, noting original vs negotiated
- **clientDistribution**: Amount actually paid to client
- **structuredSettlement**: If funds set aside for annuity/structured payments
- **pendingLiens**: Estimated amounts for unresolved liens (Medicare, etc.)

## TRANSACTIONS

Extract EACH transaction from the document with:
- **type**: "deposit" for incoming funds, "disbursement" for outgoing
- **category**: Classify appropriately:
  - "settlement_funds": Settlement proceeds received
  - "legal_fees": Attorney fee disbursements
  - "case_costs": Reimbursed expenses
  - "medical_lien": Payments to medical providers
  - "subrogation": Insurance subrogation payments
  - "client_distribution": Payments to client
  - "structured_settlement": Structured settlement funding
  - "retainer": Initial retainer payments
  - "other": Miscellaneous
- **amount**: Always positive, in dollars (e.g., 45000.00)
- For liens/subrogation, capture original amount, negotiated amount, and savings

## HOLDS

Extract hold information:
- **status**: "active" if current, "released" if resolved
- **holdType**: Classify appropriately:
  - "lien_reserve": Funds held for pending liens
  - "structured_settlement": Funds for structured settlement purchase
  - "attorney_lien": Fee holds
  - "escrow": General escrow
- Include release conditions and notes

## FINANCIAL SUMMARY

Calculate or extract:
- Trust balance, total deposits, total disbursements
- Active holds amount
- Available balance (trust balance minus holds)

## RULES
1. Extract ALL transactions found in the document
2. Extract ALL holds found in the document
3. Use null for fields not found - do not guess
4. All amounts should be numbers without currency symbols (45000.00 not "$45,000.00")
5. All dates in YYYY-MM-DD format
6. Provide confidence: "high" if explicit, "medium" if inferred, "low" if uncertain`;

/**
 * Process document through Case.dev OCR API
 * Uploads to Vercel Blob, submits to OCR, polls for completion
 */
async function processWithOCR(file: File): Promise<string> {
  const apiKey = process.env.CASE_API_KEY;
  if (!apiKey) {
    throw new Error('CASE_API_KEY is required for PDF/DOCX OCR processing.');
  }

  if (!isBlobAvailable()) {
    throw new Error(
      'PDF/DOCX extraction requires Vercel Blob storage (production only). ' +
      'For local development, use TXT files or paste text directly.'
    );
  }

  // Generate unique ID and prepare file
  const fileId = crypto.randomUUID();
  const buffer = await file.arrayBuffer();

  // Fix MIME type if needed
  let mimeType = file.type;
  if (!mimeType || mimeType === 'application/octet-stream') {
    if (file.name.endsWith('.pdf')) mimeType = 'application/pdf';
    else if (file.name.endsWith('.docx'))
      mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }

  // Upload to Vercel Blob
  const fileUrl = await storeFile(fileId, buffer, mimeType, file.name);

  if (!fileUrl) {
    throw new Error('Failed to upload file to storage.');
  }

  try {
    // Submit to Case.dev OCR
    const submitResponse = await fetch(`${CASE_API_BASE}/ocr/v1/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        document_url: fileUrl,
      }),
    });

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      throw new Error(`OCR submission failed: ${errorText}`);
    }

    const submitResult = await submitResponse.json();
    console.log('OCR submit response:', JSON.stringify(submitResult, null, 2));

    const jobId = submitResult.job_id || submitResult.id || submitResult.jobId;

    if (!jobId) {
      throw new Error('OCR service did not return a job ID');
    }

    console.log('Using job ID:', jobId);

    // Poll for completion (max 90 seconds)
    const statusUrl = `${CASE_API_BASE}/ocr/v1/${jobId}`;
    const maxAttempts = 45;
    const pollInterval = 2000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, pollInterval));

      const statusResponse = await fetch(statusUrl, {
        method: 'GET',
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (!statusResponse.ok) continue;

      const status = await statusResponse.json();

      if (status.status === 'completed') {
        let text = status.text || status.result?.text;

        // Try text endpoint if not in status response
        if (!text) {
          const textUrl = `${CASE_API_BASE}/ocr/v1/${jobId}/text`;
          const textResponse = await fetch(textUrl, {
            method: 'GET',
            headers: { Authorization: `Bearer ${apiKey}` },
          });
          if (textResponse.ok) {
            text = await textResponse.text();
          }
        }

        if (!text) {
          throw new Error('OCR completed but no text was returned');
        }

        return text;
      }

      if (status.status === 'failed') {
        const errorMsg = status.error || status.message || 'Unknown error';
        throw new Error(`OCR processing failed: ${errorMsg}`);
      }
    }

    throw new Error('OCR processing timed out after 90 seconds');
  } finally {
    // Always clean up the uploaded file
    await deleteFile(fileId);
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const textContent = formData.get('textContent') as string | null;
    const fileName = file.name.toLowerCase();
    const fileType = file.type;

    let documentText: string;
    let extractionMethod: 'direct' | 'ocr' | 'provided' = 'direct';

    // Determine how to extract text
    if (textContent && textContent.trim().length > 10) {
      // Text content provided (from client-side extraction or manual input)
      documentText = textContent;
      extractionMethod = 'provided';
    } else if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
      // TXT files: read directly
      documentText = await file.text();
      extractionMethod = 'direct';
    } else {
      // PDF/DOCX: check file type and use OCR
      const isPDF = fileType === 'application/pdf' || fileName.endsWith('.pdf');
      const isDOCX =
        fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        fileName.endsWith('.docx');

      if (!isPDF && !isDOCX) {
        return NextResponse.json(
          { error: 'Unsupported file type. Please upload PDF, DOCX, or TXT files.' },
          { status: 400 }
        );
      }

      // Process with OCR
      documentText = await processWithOCR(file);
      extractionMethod = 'ocr';
    }

    if (!documentText || documentText.trim().length < 10) {
      return NextResponse.json(
        { error: 'Document appears to be empty or too short' },
        { status: 400 }
      );
    }

    // Allow longer documents for comprehensive extraction
    const maxLength = 30000;
    const truncatedText = documentText.length > maxLength
      ? documentText.substring(0, maxLength) + '\n\n[Document truncated...]'
      : documentText;

    // Extract structured data using AI
    const extractedInfo = await extractStructuredData<ExtractedMatterInfo>(
      truncatedText,
      EXTRACTION_SCHEMA,
      EXTRACTION_INSTRUCTIONS
    );

    // Ensure arrays exist
    if (!extractedInfo.transactions) {
      extractedInfo.transactions = [];
    }
    if (!extractedInfo.holds) {
      extractedInfo.holds = [];
    }

    const response: MatterExtractionResponse = {
      success: true,
      data: extractedInfo,
      metadata: {
        filename: file.name,
        fileSize: file.size,
        extractedAt: new Date().toISOString(),
        transactionCount: extractedInfo.transactions.length,
        holdCount: extractedInfo.holds.length,
        extractionMethod,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Matter extraction error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('CASE_API_KEY')) {
      return NextResponse.json(
        { error: 'AI service not configured. Please set up your CASE_API_KEY environment variable.' },
        { status: 503 }
      );
    }

    if (errorMessage.includes('Vercel Blob')) {
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }

    if (errorMessage.includes('OCR')) {
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: `Failed to extract matter information: ${errorMessage}` },
      { status: 500 }
    );
  }
}
