/**
 * Extract Transaction Information from Document
 *
 * API route that uses AI to extract transaction information from uploaded documents.
 * Supports invoices, receipts, checks, wire transfer confirmations, etc.
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractStructuredData } from '@/lib/case-dev/client';
import {
  parseUsageFromRequest,
  checkUsageLimitsServer,
  createLimitExceededResponse,
} from '@/lib/usage/server';

export interface ExtractedTransactionInfo {
  transactionType: 'deposit' | 'disbursement' | null;
  amount: number | null;
  description: string | null;
  payor: string | null;
  payee: string | null;
  checkNumber: string | null;
  referenceNumber: string | null;
  date: string | null;
  matterReference: string | null;
  bankInfo: string | null;
  memo: string | null;
  confidence: {
    overall: 'high' | 'medium' | 'low';
    fields: Record<string, 'high' | 'medium' | 'low'>;
  };
}

const EXTRACTION_SCHEMA = `{
  "transactionType": "deposit | disbursement | null",
  "amount": "number or null (in dollars, e.g., 5000.00)",
  "description": "string or null",
  "payor": "string or null",
  "payee": "string or null",
  "checkNumber": "string or null",
  "referenceNumber": "string or null",
  "date": "string or null (ISO format YYYY-MM-DD)",
  "matterReference": "string or null",
  "bankInfo": "string or null",
  "memo": "string or null",
  "confidence": {
    "overall": "high | medium | low",
    "fields": {
      "amount": "high | medium | low",
      "transactionType": "high | medium | low"
    }
  }
}`;

const EXTRACTION_INSTRUCTIONS = `You are an expert financial document analyst for a law firm's trust account (IOLTA). Extract transaction information from the provided document.

## Document Types You May Encounter:
- Checks (incoming or outgoing)
- Wire transfer confirmations
- ACH transfer receipts
- Invoices
- Payment receipts
- Bank statements
- Settlement statements
- Retainer agreements with payment info

## Fields to Extract:

1. **transactionType**: Determine if this is a deposit or disbursement:
   - "deposit": Money coming INTO the trust account (client payments, settlement proceeds, retainers)
   - "disbursement": Money going OUT of the trust account (payments to vendors, refunds, distributions)
   - Look for words like "received", "deposited", "credited" (deposit) vs "paid", "disbursed", "withdrawn" (disbursement)

2. **amount**: The transaction amount in dollars (e.g., 5000.00, not 500000 cents)
   - Extract the primary/total amount
   - Remove currency symbols and commas
   - If multiple amounts, use the total or primary amount

3. **description**: A brief description of what this transaction is for
   - Invoice descriptions, memo lines, purpose statements
   - Keep it concise (1-2 sentences)

4. **payor**: Who is paying/sending the money
   - For deposits: the client or source of funds
   - Look for "From:", "Payor:", "Remitter:", client name

5. **payee**: Who is receiving the money
   - For disbursements: the vendor, court, or recipient
   - Look for "To:", "Payee:", "Pay to the order of:"

6. **checkNumber**: Check number if this is a check transaction
   - Usually in top right corner of checks
   - May be labeled "Check #", "No.", or similar

7. **referenceNumber**: Any reference, invoice, or confirmation number
   - Wire transfer confirmation numbers
   - Invoice numbers
   - Transaction IDs

8. **date**: The transaction date in YYYY-MM-DD format
   - Check date, transfer date, invoice date
   - Convert to ISO format

9. **matterReference**: Any case or matter reference mentioned
   - Case numbers, matter names, file references
   - "RE:", "Reference:", "Matter:"

10. **bankInfo**: Bank account or routing information if visible
    - Last 4 digits of account, bank name

11. **memo**: Any memo line or additional notes

## Confidence Levels:
- "high": Information is clearly stated (exact amount on check, explicit payee)
- "medium": Information is reasonably inferred (type based on context)
- "low": Information is uncertain or partially visible

## Rules:
- Return null for fields not found - do not guess
- For amount, return the numeric value only (5000.00, not "$5,000.00")
- Always try to determine transactionType based on context
- If the document doesn't appear to be a financial document, set overall confidence to "low"`;

export async function POST(request: NextRequest) {
  try {
    // Check demo usage limits before processing
    const usage = parseUsageFromRequest(request);
    const usageCheck = checkUsageLimitsServer(usage);

    if (!usageCheck.isAllowed) {
      return NextResponse.json(createLimitExceededResponse(usageCheck), { status: 429 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Get pre-extracted text content
    const textContent = formData.get('textContent') as string | null;

    let documentText: string;

    if (textContent) {
      documentText = textContent;
    } else if (file.type === 'text/plain') {
      documentText = await file.text();
    } else {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload a text file or provide extracted text.' },
        { status: 400 }
      );
    }

    if (!documentText || documentText.trim().length < 10) {
      return NextResponse.json(
        { error: 'Document appears to be empty or too short' },
        { status: 400 }
      );
    }

    // Truncate very long documents to avoid token limits
    const maxLength = 15000;
    const truncatedText = documentText.length > maxLength
      ? documentText.substring(0, maxLength) + '\n\n[Document truncated...]'
      : documentText;

    // Extract structured data using AI
    const extractedInfo = await extractStructuredData<ExtractedTransactionInfo>(
      truncatedText,
      EXTRACTION_SCHEMA,
      EXTRACTION_INSTRUCTIONS
    );

    return NextResponse.json({
      success: true,
      data: extractedInfo,
      metadata: {
        filename: file.name,
        fileSize: file.size,
        extractedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Transaction extraction error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Check for API key issues
    if (errorMessage.includes('CASE_API_KEY')) {
      return NextResponse.json(
        { error: 'AI service not configured. Please set up your CASE_API_KEY environment variable.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: `Failed to extract transaction information: ${errorMessage}` },
      { status: 500 }
    );
  }
}
