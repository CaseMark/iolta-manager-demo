/**
 * Case.dev Client
 *
 * Client for interacting with Case.dev AI services.
 * Used for document analysis and matter information extraction.
 */

// Simple client that uses fetch - works without the full SDK
const CASE_API_BASE = 'https://api.case.dev';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Create a chat completion using Case.dev LLM API
 */
export async function createChatCompletion(
  messages: ChatMessage[],
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }
): Promise<string> {
  const apiKey = process.env.CASE_API_KEY;

  if (!apiKey) {
    throw new Error('CASE_API_KEY environment variable is not set');
  }

  const response = await fetch(`${CASE_API_BASE}/llm/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: options?.model || 'anthropic/claude-3-5-sonnet-20241022',
      messages,
      temperature: options?.temperature ?? 0.1,
      max_tokens: options?.maxTokens ?? 4096,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Case.dev API error: ${response.status} - ${error}`);
  }

  const data: ChatCompletionResponse = await response.json();
  return data.choices[0]?.message?.content || '';
}

/**
 * Extract structured data from text using AI
 */
export async function extractStructuredData<T>(
  text: string,
  schema: string,
  instructions: string
): Promise<T> {
  const systemPrompt = `You are a legal document analysis assistant. Extract structured information from documents accurately.

${instructions}

Respond ONLY with valid JSON matching this schema:
${schema}

Do not include any explanation or markdown formatting - just the raw JSON object.`;

  const result = await createChatCompletion([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: text },
  ]);

  // Parse the JSON response
  try {
    // Try to extract JSON from the response (in case there's any extra text)
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(result);
  } catch (error) {
    throw new Error(`Failed to parse AI response as JSON: ${result}`);
  }
}
