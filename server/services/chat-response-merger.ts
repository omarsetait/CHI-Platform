import OpenAI from "openai";

const openai = new OpenAI();

interface MergerInput {
  userMessage: string;
  documentResponse?: {
    content: string;
    sources: Array<{index: number; documentTitle: string; sectionTitle: string; pageNumber: number}>;
  };
  dataResponse?: {
    content: string;
    toolsUsed: string[];
  };
}

export async function mergeResponses(input: MergerInput): Promise<string> {
  const { userMessage, documentResponse, dataResponse } = input;

  // If only one source has content, return it directly
  if (documentResponse && !dataResponse) {
    console.info("[Chat][Merger] doc_available=true data_available=false passthrough=doc");
    return documentResponse.content;
  }
  if (dataResponse && !documentResponse) {
    console.info("[Chat][Merger] doc_available=false data_available=true passthrough=data");
    return dataResponse.content;
  }
  if (!documentResponse && !dataResponse) {
    console.info("[Chat][Merger] doc_available=false data_available=false passthrough=empty");
    return "I couldn't find relevant information to answer your question.";
  }

  const start = Date.now();
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.3,
    max_tokens: 2000,
    messages: [
      {
        role: "system",
        content: `You are a response merger. Combine two information sources into a single coherent response.
Preserve citation references [1], [2] from the document source.
Attribute data from the platform source as "According to platform data..."
Create a unified narrative that flows naturally.`
      },
      {
        role: "user",
        content: `User question: "${userMessage}"

Document knowledge response:
${documentResponse?.content || "No document information found."}

Platform data response:
${dataResponse?.content || "No platform data found."}

Merge these into a single, well-structured response.`
      }
    ]
  });

  console.info(`[Chat][Merger] doc_available=true data_available=true latency=${Date.now() - start}ms`);
  return response.choices[0].message.content || "Unable to merge responses.";
}
