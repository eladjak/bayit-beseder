# AI Planning Research — Summary for Implementation

## Key Findings

### Voice Technology
- **Web Speech API** (FREE): Hebrew `he-IL` supported, Chrome-only, good for MVP
- **Deepgram**: Professional Hebrew STT, <300ms latency, premium option
- **ElevenLabs v3**: Hebrew TTS, natural voice, alpha API, v2 is stable alternative

### Onboarding Pattern (Typeform-style)
1. Name your home (commitment)
2. Home size (tappable buttons)
3. Cleaning personality quiz (2 fun questions)
4. Generated plan preview
5. Done — under 2 minutes

### AI Planner Chat Interface
- Chat-style with AI leading conversation
- Tappable Hebrew answer chips + free text + voice mic
- AI generates weekly plans, suggests rebalancing
- Stores preferences in Supabase profile

### Progressive Profiling
- Week 1: Home basics
- Week 2: Plan feedback ("too heavy?")
- Week 3: Task preferences
- Monthly: Personality check-in

### From Competitors
- **Sweepy**: Effort-point system (1-3 points per task), low-energy filters
- **Tody**: Green-to-red urgency bars, FairShare labor visualization
- **Ohai**: AI generates plan, user approves/adjusts

## Implementation Priority
1. Conversational onboarding wizard (replace current task-setup-wizard)
2. AI planner chat interface (new page or dashboard section)
3. Voice input (Web Speech API MVP)
4. Progressive profiling micro-moments
5. Voice output (ElevenLabs morning briefing)
