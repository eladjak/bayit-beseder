# AI Home Planner — Product Specification

## Vision
Transform bayit-beseder from a static task manager to an AI-powered home planning assistant.
"I've got your back on planning — just tell me about yourself and I'll handle the rest."

## Core Experience

### Phase 1: Conversational Onboarding (replaces current task-setup-wizard)

A Typeform-style full-screen, one-question-at-a-time flow:

**Screen 1: Welcome**
- "היי! 👋 אני העוזר החכם של בית בסדר"
- "בואו נכיר — אני אשאל כמה שאלות קצרות ואבנה לכם תוכנית מותאמת אישית"
- [המשך] button

**Screen 2: Name Your Home**
- "איך קוראים לבית שלכם?"
- Input field with suggestions: "הדירה שלנו", "בית כהן", "הקן"
- This creates emotional investment

**Screen 3: Home Size**
- "כמה חדרים יש אצלכם?"
- Tappable cards: סטודיו | 2 חדרים | 3 חדרים | 4 חדרים | 5+
- Visual: each card shows a simple house illustration that grows

**Screen 4: Who Lives Here?**
- "מי גר בבית?"
- Toggle cards: 👫 זוג | 👶 ילדים (כמה?) | 🐱 חיות מחמד | 👴 הורים

**Screen 5: Cleaning Personality**
- "מה הסגנון שלכם?"
- Two fun questions:
  1. "ספרינט ניקיון או תחזוקה יומית?" → affects daily vs weekly task balance
  2. "כמה זמן ביום אתם מוכנים להשקיע?" → 15/30/60 דקות

**Screen 6: AI Generates Plan**
- Loading animation with personality: "חושב... מחשב... כמעט..."
- Shows generated weekly plan preview
- "הנה התוכנית שיצרתי עבורכם! 🎉"
- [מתחילים!] button

### Phase 2: AI Planner Chat (new section in app)

A chat-style interface accessible from a new "תכנון" area:

**UI Elements:**
- Chat messages (AI + User)
- Tappable suggestion chips in Hebrew
- Voice input button (mic icon, Web Speech API)
- Text input field
- "Quick actions" bar: [תכנן את השבוע] [שנה חלוקה] [יום קל] [תן לי טיפ]

**AI Capabilities:**
- Generate weekly plans based on household profile
- Rebalance tasks between partners
- Suggest "low energy day" alternatives
- Answer questions about cleaning tips
- Remember preferences across sessions

**Tech Stack:**
- Claude API (or Gemini) for chat intelligence
- Next.js API route as proxy
- Streaming responses to chat UI
- User context from Supabase profile + task history
- Conversation stored in localStorage (or Supabase for sync)

### Phase 3: Voice Integration

**Input (STT):**
- Web Speech API (`he-IL`) — free, Chrome
- Mic button in chat + floating mic on all pages
- Real-time RTL transcription
- Fallback: text-only on unsupported browsers

**Output (TTS) — Future:**
- ElevenLabs v2 Hebrew TTS
- Morning briefing: "בוקר טוב! היום יש לכם 4 משימות..."
- Task completion celebration voice

## Technical Architecture

```
User → Chat UI (React) → /api/ai/chat (Next.js)
                              ↓
                         Claude/Gemini API
                         + User context (Supabase)
                         + Task history
                         + Household profile
                              ↓
                         Streaming response → Chat UI
```

## Implementation Order
1. Conversational onboarding wizard (replace existing)
2. Basic AI chat interface (text only)
3. Voice input (Web Speech API)
4. Smart plan generation
5. Progressive profiling micro-moments
6. Voice output (ElevenLabs)

## Design Principles
- One question at a time (Typeform pattern)
- Tappable answers > free text (lower friction)
- Show immediate impact of each answer
- Warm, friendly Hebrew copy
- The AI leads, user approves
- Voice is enhancement, not requirement
