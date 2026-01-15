'use client';

/**
 * Transaction Extractor Component
 *
 * Upload a document and extract transaction information using AI.
 * Supports PDF (via pdf.js), text files, and manual text input.
 */

import { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  FileText,
  Upload,
  X,
  Sparkle,
  Warning,
  CheckCircle,
  Spinner,
  TextT,
  CurrencyDollar,
  ArrowDown,
  ArrowUp,
} from '@phosphor-icons/react';
import { useUsage } from '@/lib/contexts/usage-context';
import * as pdfjsLib from 'pdfjs-dist';

// Configure pdf.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

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

interface TransactionExtractorProps {
  onExtracted: (data: ExtractedTransactionInfo) => void;
  onClose?: () => void;
}

type InputMode = 'file' | 'text';

export function TransactionExtractor({ onExtracted, onClose }: TransactionExtractorProps) {
  const [inputMode, setInputMode] = useState<InputMode>('file');
  const [file, setFile] = useState<File | null>(null);
  const [manualText, setManualText] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedTransactionInfo | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { getUsageHeader, addLLMUsage, isLimitExceeded } = useUsage();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      setError(null);
      setExtractedData(null);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setExtractedData(null);
    }
  }, []);

  /**
   * Extract text from PDF using pdf.js
   */
  const extractTextFromPdf = async (file: File): Promise<string> => {
    setExtractionProgress('Loading PDF...');

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    const textParts: string[] = [];
    const totalPages = pdf.numPages;

    for (let i = 1; i <= totalPages; i++) {
      setExtractionProgress(`Extracting page ${i} of ${totalPages}...`);
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ');
      textParts.push(pageText);
    }

    setExtractionProgress(null);
    const fullText = textParts.join('\n\n');

    if (!fullText.trim()) {
      throw new Error('PDF appears to be empty or contains only images. Please paste the text manually.');
    }

    return fullText;
  };

  /**
   * Extract text from file based on type
   */
  const extractTextFromFile = async (file: File): Promise<string> => {
    if (file.type === 'text/plain') {
      const text = await file.text();
      if (!text.trim()) {
        throw new Error('Text file is empty.');
      }
      return text;
    }

    if (file.type === 'application/pdf') {
      return extractTextFromPdf(file);
    }

    throw new Error('Unsupported file type. Please upload a .txt or .pdf file, or paste text directly.');
  };

  const handleExtract = async () => {
    if (inputMode === 'file' && !file) return;
    if (inputMode === 'text' && !manualText.trim()) {
      setError('Please enter some text to extract information from.');
      return;
    }

    // Check if limits are already exceeded
    if (isLimitExceeded) {
      setError('Demo usage limit reached. Create an account at console.case.dev for unlimited access.');
      return;
    }

    setExtracting(true);
    setError(null);
    setExtractionProgress(null);

    try {
      let textContent: string;

      if (inputMode === 'file' && file) {
        textContent = await extractTextFromFile(file);
      } else {
        textContent = manualText.trim();
      }

      if (textContent.length < 20) {
        throw new Error('Text is too short. Please provide more document content for accurate extraction.');
      }

      setExtractionProgress('Analyzing document with AI...');

      const formData = new FormData();
      if (file && inputMode === 'file') {
        formData.append('file', file);
      } else {
        const blob = new Blob([textContent], { type: 'text/plain' });
        formData.append('file', blob, 'pasted-text.txt');
      }
      formData.append('textContent', textContent);

      // Build headers with usage info
      const headers: Record<string, string> = {};
      const usageHeader = getUsageHeader();
      if (usageHeader) {
        headers['X-Demo-Usage'] = usageHeader;
      }

      const response = await fetch('/api/extract-transaction', {
        method: 'POST',
        headers,
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle rate limit response
        if (response.status === 429) {
          throw new Error(result.message || 'Demo usage limit reached. Create an account at console.case.dev for unlimited access.');
        }
        throw new Error(result.error || 'Failed to extract information');
      }

      // Track usage (estimate ~1000 input tokens, ~800 output tokens for transaction extraction)
      addLLMUsage(1000, 800);

      setExtractedData(result.data);
      setExtractionProgress(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extract information');
      setExtractionProgress(null);
    } finally {
      setExtracting(false);
    }
  };

  const handleApply = () => {
    if (extractedData) {
      onExtracted(extractedData);
    }
  };

  const getConfidenceBadge = (confidence: 'high' | 'medium' | 'low') => {
    switch (confidence) {
      case 'high':
        return <Badge variant="default">High</Badge>;
      case 'medium':
        return <Badge variant="secondary">Medium</Badge>;
      case 'low':
        return <Badge variant="outline">Low</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <Card className="border-2 border-dashed border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <CurrencyDollar size={18} className="text-primary" weight="fill" />
            </div>
            <div>
              <CardTitle className="text-base">AI Transaction Extraction</CardTitle>
              <CardDescription className="text-xs">
                Upload an invoice, check, or receipt to auto-fill
              </CardDescription>
            </div>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon-sm" onClick={onClose}>
              <X size={16} />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!extractedData ? (
          <>
            {/* Mode Toggle */}
            <div className="flex gap-2 p-1 bg-muted rounded-lg">
              <button
                type="button"
                onClick={() => {
                  setInputMode('file');
                  setError(null);
                }}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  inputMode === 'file'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Upload size={16} />
                Upload File
              </button>
              <button
                type="button"
                onClick={() => {
                  setInputMode('text');
                  setError(null);
                }}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  inputMode === 'text'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <TextT size={16} />
                Paste Text
              </button>
            </div>

            {inputMode === 'file' ? (
              <div
                className={`
                  relative border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer
                  ${isDragging ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary/50'}
                  ${file ? 'bg-muted/50' : ''}
                `}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {file ? (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText size={20} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                      }}
                    >
                      <X size={16} />
                    </Button>
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload size={32} className="mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium">Drop a document here</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Invoices, checks, receipts (.txt, .pdf)
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Textarea
                  placeholder="Paste invoice, check, or receipt text here...

Example:
Check #1234
Date: January 10, 2024
Pay to: Smith & Associates
Amount: $5,000.00
Memo: Settlement payment - Case #2024-001"
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  className="min-h-[140px] text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  {manualText.length > 0 && `${manualText.length.toLocaleString()} characters`}
                </p>
              </div>
            )}

            {extractionProgress && (
              <div className="flex items-center gap-2 p-3 bg-primary/10 text-primary rounded-lg text-sm">
                <Spinner size={16} className="animate-spin shrink-0" />
                <p>{extractionProgress}</p>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                <Warning size={18} className="shrink-0 mt-0.5" />
                <div>
                  <p>{error}</p>
                  {inputMode === 'file' && error.includes('paste') && (
                    <button
                      type="button"
                      onClick={() => setInputMode('text')}
                      className="mt-2 text-xs underline hover:no-underline"
                    >
                      Switch to Paste Text mode
                    </button>
                  )}
                </div>
              </div>
            )}

            <Button
              className="w-full"
              onClick={handleExtract}
              disabled={(inputMode === 'file' ? !file : !manualText.trim()) || extracting}
            >
              {extracting ? (
                <>
                  <Spinner size={16} className="mr-2 animate-spin" />
                  {extractionProgress || 'Extracting...'}
                </>
              ) : (
                <>
                  <Sparkle size={16} className="mr-2" weight="fill" />
                  Extract Transaction Info
                </>
              )}
            </Button>
          </>
        ) : (
          <>
            {/* Extracted Results */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CheckCircle size={18} className="text-primary" weight="fill" />
                <span className="text-sm font-medium">Extraction Complete</span>
              </div>
              {getConfidenceBadge(extractedData.confidence.overall)}
            </div>

            <div className="space-y-3 text-sm max-h-64 overflow-y-auto pr-1">
              {/* Transaction Type & Amount */}
              {(extractedData.transactionType || extractedData.amount) && (
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  {extractedData.transactionType && (
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-muted text-muted-foreground">
                      {extractedData.transactionType === 'deposit' ? (
                        <ArrowDown size={20} weight="bold" />
                      ) : (
                        <ArrowUp size={20} weight="bold" />
                      )}
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground uppercase">
                      {extractedData.transactionType || 'Transaction'}
                    </p>
                    <p className="text-xl font-semibold">
                      {extractedData.amount ? formatCurrency(extractedData.amount) : 'Amount not found'}
                    </p>
                  </div>
                </div>
              )}

              {/* Details */}
              <div className="space-y-1.5">
                {extractedData.description && (
                  <div className="flex justify-between py-1 border-b border-dashed">
                    <span className="text-muted-foreground">Description</span>
                    <span className="font-medium text-right max-w-[60%]">{extractedData.description}</span>
                  </div>
                )}
                {extractedData.payor && (
                  <div className="flex justify-between py-1 border-b border-dashed">
                    <span className="text-muted-foreground">From (Payor)</span>
                    <span className="font-medium">{extractedData.payor}</span>
                  </div>
                )}
                {extractedData.payee && (
                  <div className="flex justify-between py-1 border-b border-dashed">
                    <span className="text-muted-foreground">To (Payee)</span>
                    <span className="font-medium">{extractedData.payee}</span>
                  </div>
                )}
                {extractedData.date && (
                  <div className="flex justify-between py-1 border-b border-dashed">
                    <span className="text-muted-foreground">Date</span>
                    <span className="font-medium">{extractedData.date}</span>
                  </div>
                )}
                {extractedData.checkNumber && (
                  <div className="flex justify-between py-1 border-b border-dashed">
                    <span className="text-muted-foreground">Check #</span>
                    <span className="font-medium">{extractedData.checkNumber}</span>
                  </div>
                )}
                {extractedData.referenceNumber && (
                  <div className="flex justify-between py-1 border-b border-dashed">
                    <span className="text-muted-foreground">Reference #</span>
                    <span className="font-medium">{extractedData.referenceNumber}</span>
                  </div>
                )}
                {extractedData.matterReference && (
                  <div className="flex justify-between py-1 border-b border-dashed">
                    <span className="text-muted-foreground">Matter Ref</span>
                    <span className="font-medium">{extractedData.matterReference}</span>
                  </div>
                )}
                {extractedData.memo && (
                  <div className="flex justify-between py-1 border-b border-dashed">
                    <span className="text-muted-foreground">Memo</span>
                    <span className="font-medium text-right max-w-[60%]">{extractedData.memo}</span>
                  </div>
                )}
              </div>

              {/* No data message */}
              {!extractedData.amount && !extractedData.transactionType && !extractedData.description && (
                <div className="text-center py-4 text-muted-foreground">
                  <Warning size={24} className="mx-auto mb-2" />
                  <p>No transaction information could be extracted.</p>
                  <p className="text-xs mt-1">Try uploading a different document or pasting the text directly.</p>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setExtractedData(null);
                  setFile(null);
                  setManualText('');
                }}
              >
                Try Another
              </Button>
              <Button className="flex-1" onClick={handleApply}>
                Apply to Form
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
