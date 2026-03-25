import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

// ---------------------------------------------------------------------------
// Rate limiter: 10 requests per minute per IP
// ---------------------------------------------------------------------------

const limiter = rateLimit({ windowMs: 60_000, max: 10 });

// ---------------------------------------------------------------------------
// Gemini API constants
// ---------------------------------------------------------------------------

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse";

const SYSTEM_PROMPT =
  "אתה עוזר חכם לניהול בית. אתה עוזר לזוגות לתכנן ולנהל את תחזוקת הבית. עונה בעברית, בטון חם וידידותי. תשובות קצרות וענייניות. אתה מכיר את אפליקציית 'בית בסדר'.";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HistoryMessage {
  role: "user" | "model";
  content: string;
}

interface ChatRequestBody {
  message: string;
  history?: HistoryMessage[];
}

interface GeminiPart {
  text: string;
}

interface GeminiContent {
  parts: GeminiPart[];
}

interface GeminiCandidate {
  content: GeminiContent;
}

interface GeminiSSEData {
  candidates?: GeminiCandidate[];
}

// ---------------------------------------------------------------------------
// POST /api/ai/chat
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  // 1. Rate limit check
  const ip = getClientIp(request);
  const rateLimitResult = limiter.check(ip);

  if (!rateLimitResult.success) {
    const retryAfter = Math.ceil(rateLimitResult.reset / 1000);
    return new Response(
      JSON.stringify({
        error: "יותר מדי בקשות. נסו שוב עוד דקה.",
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(retryAfter),
        },
      }
    );
  }

  // 2. Optional auth check (allow demo mode)
  let isAuthenticated = false;
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              for (const { name, value, options } of cookiesToSet) {
                cookieStore.set(name, value, options);
              }
            } catch {
              // Ignore in server component context
            }
          },
        },
      }
    );
    const {
      data: { user },
    } = await supabase.auth.getUser();
    isAuthenticated = !!user;
  } catch {
    // Auth failure is non-fatal — continue in demo mode
  }

  // 3. Parse request body
  let body: ChatRequestBody;
  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return new Response(
      JSON.stringify({ error: "גוף הבקשה אינו תקין." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { message, history = [] } = body;

  if (!message || typeof message !== "string" || !message.trim()) {
    return new Response(
      JSON.stringify({ error: "ההודעה ריקה." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // 4. Check API key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "שירות ה-AI אינו מוגדר כרגע." }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  // 5. Build Gemini request — last 10 history items + current message
  const recentHistory = history.slice(-10);

  const contents = [
    // Inject system prompt as first user/model exchange
    {
      role: "user",
      parts: [{ text: SYSTEM_PROMPT }],
    },
    {
      role: "model",
      parts: [
        {
          text: "מובן! אני כאן לעזור לכם לנהל את הבית בצורה חכמה וקלה. 😊",
        },
      ],
    },
    // Conversation history
    ...recentHistory.map((msg) => ({
      role: msg.role,
      parts: [{ text: msg.content }],
    })),
    // Current user message
    {
      role: "user",
      parts: [{ text: message.trim() }],
    },
  ];

  // 6. Call Gemini streaming API
  let geminiResponse: Response;
  try {
    geminiResponse = await fetch(`${GEMINI_API_URL}&key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 512,
        },
      }),
    });
  } catch {
    return new Response(
      JSON.stringify({ error: "שגיאת תקשורת עם שירות ה-AI. נסו שוב." }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!geminiResponse.ok) {
    const errText = await geminiResponse.text().catch(() => "");
    console.error("[AI chat] Gemini error", geminiResponse.status, errText);
    return new Response(
      JSON.stringify({ error: "שירות ה-AI החזיר שגיאה. נסו שוב מאוחר יותר." }),
      {
        status: 502,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  if (!geminiResponse.body) {
    return new Response(
      JSON.stringify({ error: "לא התקבלה תגובה מהשירות." }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  // 7. Pipe Gemini SSE → plain text stream to client
  const encoder = new TextEncoder();
  const geminiReader = geminiResponse.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const stream = new ReadableStream({
    async pull(controller) {
      while (true) {
        let done: boolean;
        let value: Uint8Array | undefined;

        try {
          ({ done, value } = await geminiReader.read());
        } catch {
          controller.close();
          return;
        }

        if (done) {
          controller.close();
          return;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        // Keep last (possibly incomplete) line in buffer
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr || jsonStr === "[DONE]") continue;

          try {
            const parsed = JSON.parse(jsonStr) as GeminiSSEData;
            const text =
              parsed.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          } catch {
            // Skip malformed JSON lines
          }
        }
      }
    },
    cancel() {
      geminiReader.cancel().catch(() => {});
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Auth": isAuthenticated ? "authenticated" : "demo",
      "Cache-Control": "no-store",
      "X-RateLimit-Limit": String(rateLimitResult.limit),
      "X-RateLimit-Remaining": String(rateLimitResult.remaining),
    },
  });
}
