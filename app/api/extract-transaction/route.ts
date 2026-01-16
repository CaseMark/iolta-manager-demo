/**
 * Extract Transaction Information from Document
 *
 * API route that uses AI to extract transaction information from uploaded documents.
 * Supports:
 * - TXT files: Read directly
 * - PDF files: OCR via Case.dev API (requires Vercel Blob storage)
 * - Manual text input: Pass textContent in form data
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractStructuredData } from '@/lib/case-dev/client';
import { storeFile, deleteFile, isBlobAvailable } from '@/lib/file-store';
import {
  parseUsageFromRequest,
  checkUsageLimitsServer,
  createLimitExceededResponse,
} from '@/lib/usage/server';

const CASE_API_BASE = process.env.CASE_API_URL || 'https://api.case.dev';

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

/**
 * Process document through Case.dev OCR API
 * Uploads to Vercel Blob, submits to OCR, polls for completion
 */
async function processWithOCR(file: File): Promise<string> {
  const apiKey = process.env.CASE_API_KEY;
  if (!apiKey) {
    throw new Error('CASE_API_KEY is required for PDF OCR processing.');
  }

  if (!isBlobAvailable()) {
    throw new Error(
      'PDF extraction requires Vercel Blob storage. ' +
      'Please set BLOB_READ_WRITE_TOKEN in your environment, or use TXT files / paste text directly.'
    );
  }

  // Generate unique ID and prepare file
  const fileId = crypto.randomUUID();
  const buffer = await file.arrayBuffer();

  // Fix MIME type if needed
  let mimeType = file.type;
  if (!mimeType || mimeType === 'application/octet-stream') {
    if (file.name.endsWith('.pdf')) mimeType = 'application/pdf';
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
    const jobId = submitResult.job_id || submitResult.id || submitResult.jobId;

    if (!jobId) {
      throw new Error('OCR service did not return a job ID');
    }

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
        let text = status.text || status.result?.text || status.extracted_text || status.content;

        // If text is in pages array, concatenate all page texts
        if (!text && status.pages && Array.isArray(status.pages)) {
          text = status.pages
            .map((page: { text?: string; content?: string }) => page.text || page.content || '')
            .join('\n\n');
        }

        // Try download/json endpoint if not in status response
        if (!text) {
          const jsonUrl = `${CASE_API_BASE}/ocr/v1/${jobId}/download/json`;
          const jsonResponse = await fetch(jsonUrl, {
            method: 'GET',
            headers: { Authorization: `Bearer ${apiKey}` },
          });

          if (jsonResponse.ok) {
            const contentType = jsonResponse.headers.get('content-type') || '';

            if (contentType.includes('application/json')) {
              const jsonResult = await jsonResponse.json();

              // Try common field patterns
              text = jsonResult.text || jsonResult.extracted_text || jsonResult.content;

              // Check pages array
              if (!text && jsonResult.pages && Array.isArray(jsonResult.pages)) {
                text = jsonResult.pages
                  .map((page: { text?: string; content?: string }) => page.text || page.content || '')
                  .join('\n\n');
              }
            } else {
              // Plain text response
              text = await jsonResponse.text();
            }
          } else {
            console.error('OCR result fetch failed:', jsonResponse.status, await jsonResponse.text());
          }
        }

        if (!text) {
          throw new Error('OCR completed but no text was returned. The document may be empty or unscannable.');
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

    const textContent = formData.get('textContent') as string | null;
    const fileName = file.name.toLowerCase();
    const fileType = file.type;

    let documentText: string;
    let extractionMethod: 'direct' | 'ocr' | 'provided' = 'direct';

    // Determine how to extract text
    if (textContent && textContent.trim().length > 10) {
      // Text content provided (from client-side or manual input)
      documentText = textContent;
      extractionMethod = 'provided';
    } else if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
      // TXT files: read directly
      documentText = await file.text();
      extractionMethod = 'direct';
    } else {
      // PDF: use OCR
      const isPDF = fileType === 'application/pdf' || fileName.endsWith('.pdf');

      if (!isPDF) {
        return NextResponse.json(
          { error: 'Unsupported file type. Please upload PDF or TXT files.' },
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
        extractionMethod,
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

    if (errorMessage.includes('Vercel Blob') || errorMessage.includes('BLOB_READ_WRITE_TOKEN')) {
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
      { error: `Failed to extract transaction information: ${errorMessage}` },
      { status: 500 }
    );
  }
}
