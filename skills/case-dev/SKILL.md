# Case.dev SDK Skill

## Purpose

This skill covers the Case.dev API platform integration for legal tech applications, including document vaults, AI models, OCR, transcription, and workflows.

## Key Concepts

- **Vaults**: Encrypted document storage with semantic search and RAG
- **LLMs**: Unified gateway to 130+ AI models (Claude, GPT-4, CaseMark Core 1)
- **OCR**: Production-grade document digitization with table extraction
- **Voice**: Transcription with speaker diarization for depositions
- **Workflows**: 700+ expert-crafted legal prompts and processing pipelines
- **Orbit Compute**: Serverless functions and app deployments

## Setup

### Installation

```bash
# TypeScript/JavaScript
bun add git+ssh://git@github.com:stainless-sdks/router-typescript.git

# Once published to npm:
# bun add casedev
```

### Environment Variables

```env
# .env.local
CASE_API_KEY=sk_case_...
CASEDEV_API_KEY=sk_case_...
```

### Initialize Client

```typescript
// lib/case-dev/client.ts
import Casedev from 'casedev';

export const casedev = new Casedev({
  apiKey: process.env.CASEDEV_API_KEY!,
  environment: 'production', // or 'local' for development
});
```

## Project Structure

```
/
├── app/
│   ├── api/
│   │   └── case-dev/
│   │       ├── upload/route.ts
│   │       ├── search/route.ts
│   │       └── analyze/route.ts
├── lib/
│   └── case-dev/
│       ├── client.ts
│       ├── vaults.ts
│       ├── llm.ts
│       └── ocr.ts
└── ...
```

## Vaults - Document Storage

### Create a Vault

```typescript
// lib/case-dev/vaults.ts
import { casedev } from './client';

export async function createVault(name: string, description?: string) {
  const vault = await casedev.vault.create({
    name,
    description,
  });
  
  return vault;
}
```

### Upload Document to Vault

```typescript
export async function uploadDocument(
  vaultId: string,
  file: File,
  options?: {
    ocr?: boolean;
    semanticIndex?: boolean;
  }
) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('vault_id', vaultId);
  
  if (options?.ocr) {
    formData.append('ocr', 'true');
  }
  
  if (options?.semanticIndex) {
    formData.append('semantic_index', 'true');
  }
  
  const doc = await casedev.vault.upload(formData);
  
  return doc;
}
```

### Search Vault by Semantic Meaning

```typescript
export async function searchVault(
  vaultId: string,
  query: string,
  options?: {
    limit?: number;
    threshold?: number;
  }
) {
  const results = await casedev.vault.search({
    vault_id: vaultId,
    query,
    limit: options?.limit || 10,
    threshold: options?.threshold || 0.7,
  });
  
  return results;
}
```

### Retrieve Document

```typescript
export async function getDocument(documentId: string) {
  const document = await casedev.vault.retrieve(documentId);
  return document;
}
```

## LLMs - AI Models

### Chat Completion

```typescript
// lib/case-dev/llm.ts
import { casedev } from './client';

export async function chatCompletion(
  messages: Array<{ role: string; content: string }>,
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }
) {
  const response = await casedev.llm.v1.chat.createCompletion({
    model: options?.model || 'anthropic/claude-3-5-sonnet-20241022',
    messages,
    temperature: options?.temperature,
    max_tokens: options?.maxTokens,
  });
  
  return response.choices[0].message.content;
}
```

### Available Models

```typescript
// Popular models
const MODELS = {
  // Anthropic Claude
  CLAUDE_35_SONNET: 'anthropic/claude-3-5-sonnet-20241022',
  CLAUDE_35_HAIKU: 'anthropic/claude-3-5-haiku-20241022',
  
  // OpenAI
  GPT_4O: 'openai/gpt-4o',
  GPT_4O_MINI: 'openai/gpt-4o-mini',
  
  // CaseMark - Legal-optimized
  CASEMARK_CORE_1: 'casemark-core-1',
  
  // Google
  GEMINI_15_PRO: 'google/gemini-1.5-pro',
};
```

### Streaming Responses

```typescript
export async function streamChatCompletion(
  messages: Array<{ role: string; content: string }>,
  onChunk: (chunk: string) => void
) {
  const stream = await casedev.llm.v1.chat.createCompletion({
    model: 'anthropic/claude-3-5-sonnet-20241022',
    messages,
    stream: true,
  });
  
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      onChunk(content);
    }
  }
}
```

### Embeddings

```typescript
export async function generateEmbeddings(
  text: string,
  model: string = 'voyage-law-2'
) {
  const response = await casedev.llm.v1.embeddings.create({
    input: text,
    model,
  });
  
  return response.data[0].embedding;
}
```

## OCR - Document Digitization

### Process Document

```typescript
// lib/case-dev/ocr.ts
import { casedev } from './client';

export async function processDocument(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  
  const job = await casedev.ocr.process(formData);
  
  return job;
}
```

### Check OCR Status

```typescript
export async function checkOCRStatus(jobId: string) {
  const status = await casedev.ocr.status(jobId);
  
  return {
    status: status.status, // 'pending', 'processing', 'completed', 'failed'
    progress: status.progress,
    result: status.result,
  };
}
```

### Download OCR Results

```typescript
export async function downloadOCRResults(jobId: string) {
  const results = await casedev.ocr.download(jobId);
  
  return {
    text: results.text,
    tables: results.tables,
    metadata: results.metadata,
  };
}
```

## Voice - Transcription

### Transcribe Audio

```typescript
// lib/case-dev/voice.ts
import { casedev } from './client';

export async function transcribeAudio(
  audioFile: File,
  options?: {
    speakerLabels?: boolean;
    language?: string;
  }
) {
  const formData = new FormData();
  formData.append('file', audioFile);
  
  if (options?.speakerLabels) {
    formData.append('speaker_labels', 'true');
  }
  
  if (options?.language) {
    formData.append('language', options.language);
  }
  
  const transcription = await casedev.voice.transcribe(formData);
  
  return transcription;
}
```

### Text-to-Speech

```typescript
export async function textToSpeech(
  text: string,
  voice: string = 'default'
) {
  const audio = await casedev.voice.speech({
    text,
    voice,
  });
  
  return audio;
}
```

## Workflows

### Run Legal Workflow

```typescript
// lib/case-dev/workflows.ts
import { casedev } from './client';

export async function runWorkflow(
  workflowName: string,
  input: Record<string, any>
) {
  const result = await casedev.workflows.run(workflowName, input);
  
  return result;
}
```

### Common Workflows

```typescript
// Contract Review
export async function reviewContract(documentId: string) {
  return await runWorkflow('contract-review', {
    document: documentId,
    model: 'casemark-core-1',
  });
}

// Document Summarization
export async function summarizeDocument(documentId: string) {
  return await runWorkflow('document-summary', {
    document: documentId,
    length: 'medium',
  });
}

// Clause Extraction
export async function extractClauses(documentId: string) {
  return await runWorkflow('clause-extraction', {
    document: documentId,
    types: ['termination', 'liability', 'confidentiality'],
  });
}
```

## Web Search

### Search the Web

```typescript
// lib/case-dev/search.ts
import { casedev } from './client';

export async function searchWeb(query: string) {
  const results = await casedev.search.search({
    query,
    num_results: 10,
  });
  
  return results;
}
```

### AI-Powered Research

```typescript
export async function aiResearch(query: string) {
  const answer = await casedev.search.answer({
    query,
    include_citations: true,
  });
  
  return answer;
}
```

## Error Handling

### Typed Error Classes

```typescript
import Casedev from 'casedev';

try {
  const vault = await casedev.vault.retrieve('invalid-id');
} catch (error) {
  if (error instanceof Casedev.NotFoundError) {
    console.error('Vault not found:', error.status);
  } else if (error instanceof Casedev.RateLimitError) {
    console.error('Rate limit exceeded');
  } else if (error instanceof Casedev.AuthenticationError) {
    console.error('Invalid API key');
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Common Patterns

### Document Upload and Analysis Pipeline

```typescript
'use server';

import { casedev } from '@/lib/case-dev/client';
import { db } from '@/lib/db';
import { documents } from '@/lib/db/schema';

export async function processDocumentPipeline(
  file: File,
  vaultId: string,
  userId: string
) {
  try {
    // 1. Upload to vault with OCR
    const doc = await casedev.vault.upload({
      file,
      vault_id: vaultId,
      ocr: true,
      semantic_index: true,
    });
    
    // 2. Store reference in database
    await db.insert(documents).values({
      id: doc.id,
      userId,
      vaultId,
      filename: file.name,
      status: 'processing',
    });
    
    // 3. Run analysis workflow
    const analysis = await casedev.workflows.run('document-analysis', {
      document: doc.id,
      model: 'casemark-core-1',
    });
    
    // 4. Update database with results
    await db.update(documents).set({
      status: 'completed',
      analysis,
    }).where({ id: doc.id });
    
    return { success: true, documentId: doc.id, analysis };
  } catch (error) {
    console.error('Pipeline error:', error);
    throw error;
  }
}
```

### RAG with Vault Search

```typescript
export async function answerQuestionWithContext(
  vaultId: string,
  question: string
) {
  // 1. Search vault for relevant documents
  const searchResults = await casedev.vault.search({
    vault_id: vaultId,
    query: question,
    limit: 5,
    threshold: 0.7,
  });
  
  // 2. Build context from search results
  const context = searchResults
    .map((result) => result.content)
    .join('\n\n---\n\n');
  
  // 3. Ask LLM with context
  const answer = await casedev.llm.v1.chat.createCompletion({
    model: 'anthropic/claude-3-5-sonnet-20241022',
    messages: [
      {
        role: 'system',
        content: 'You are a legal assistant. Answer based on the provided context.',
      },
      {
        role: 'user',
        content: `Context:\n${context}\n\nQuestion: ${question}`,
      },
    ],
  });
  
  return {
    answer: answer.choices[0].message.content,
    sources: searchResults.map((r) => r.document_id),
  };
}
```

### Deposition Transcription Workflow

```typescript
export async function processDeposition(audioFile: File) {
  // 1. Transcribe with speaker labels
  const transcription = await casedev.voice.transcribe({
    file: audioFile,
    speaker_labels: true,
    language: 'en-US',
  });
  
  // 2. Extract key testimony
  const analysis = await casedev.llm.v1.chat.createCompletion({
    model: 'casemark-core-1',
    messages: [
      {
        role: 'system',
        content: 'Extract key testimony and identify important statements.',
      },
      {
        role: 'user',
        content: transcription.text,
      },
    ],
  });
  
  return {
    transcription,
    keyTestimony: analysis.choices[0].message.content,
  };
}
```

## Best Practices

1. **Use Vaults for RAG**: Let Case.dev handle vector storage and semantic search
2. **Leverage Workflows**: Use pre-built legal workflows instead of custom prompts
3. **Error Handling**: Always catch typed errors for better debugging
4. **Async Operations**: OCR and transcription are async - poll for status
5. **Rate Limits**: SDK handles retries automatically with exponential backoff
6. **Model Selection**: Use casemark-core-1 for legal-specific tasks
7. **Semantic Search**: Set appropriate threshold (0.7 is a good default)
8. **Stream Responses**: Use streaming for better UX with long completions

## Security

### Encryption

- All data encrypted at rest with AES-256
- KMS encryption for vault storage
- TLS 1.3 for data in transit

### Compliance

- SOC 2 Type II certified
- HIPAA compliant (BAA available)
- Complete audit logs with 1-year retention

### API Keys

```env
# Production keys start with sk_case_
CASEDEV_API_KEY=sk_case_prod_...

# Development keys for testing
CASEDEV_API_KEY=sk_case_dev_...
```

## Rate Limits

Rate limits based on plan tier:

- **Starter**: 100 requests/minute
- **Professional**: 1,000 requests/minute  
- **Enterprise**: Custom limits

SDK automatically handles rate limiting with exponential backoff.

## Gotchas

- **Async Operations**: OCR and transcription return job IDs - poll for completion
- **File Size Limits**: Max 500MB for OCR, 5GB for transcription
- **Vault Search**: Requires semantic_index: true during upload
- **Model Names**: Use full provider prefix (e.g., 'anthropic/claude-3-5-sonnet')
- **Embeddings**: Use 'voyage-law-2' for legal document embeddings
- **Streaming**: Not all models support streaming - check model catalog
- **Environment**: Set to 'production' for live API, 'local' for development

## Resources

- [Official Documentation](https://docs.case.dev)
- [API Reference](https://docs.case.dev/api-reference)
- [Model Catalog](https://docs.case.dev/llms/model-catalog)
- [Cookbooks](https://docs.case.dev/cookbooks)
- [GitHub SDK](https://github.com/stainless-sdks/router-typescript)
- [Status Page](https://status.case.dev)
- [Trust Center](https://trust.casemark.com)
