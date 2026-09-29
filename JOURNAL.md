# יומן — bayit-beseder

שורה אחת לכל אירוע אמיתי: שיחה, פגישה, החלטה, הבטחה.
נכתב בזמן אמת, לא בדיעבד. הישן למטה, החדש למעלה בקריאה עם --show.

- **2026-09-28 08:17** — <task-notification>
<task-id>ab9214cd7bd87a15f</task-id>
<tool-use-id>toolu_014RR8DnvnfX3YN9vx1n6raN</tool-use-id>
<output-file>C:\Users\eladj\AppData\Local\Temp\claude\C--Users-eladj\ba8158d1-6618-4de7-8ab2-a08e6ff3a6a8\tasks\ab9214cd7bd87a15f.output</output-file>
<status>completed</status>
<summary>Agent "Bayit audit B: landing, blog, SEO" finished</summary>
<note>A task-notification fires each time this agent stops with no live background children of its own. The user can send it another message and resume it, so the same task-id may notify more than once.</note>
<result>PR opened: https://github.com/eladjak/bayit-beseder/pull/16 (branch `audit/marketing`, not merged/deployed).

**Ranked problems found and fixed:**

1. **Pricing contradiction (biggest issue).** The landing page, about page, FAQ chat, and `llms.txt` all said the app is "completely free, forever, no payment, no subscription" ג€” while `/upgrade` already sells a Plus plan at ג‚×19/month. Confirmed live with `grep` against the real site. Rewrote every claim: tasks + shopping list are free; AI features (smart weekly planning, full stats, Passover mode, etc.) cost ג‚×19/month per household with a free trial. Also fixed the landing page's structured data (JSON-LD) so it no longer claims the whole app costs ג‚×0.

2. **The pricing page itself had a third, unapproved plan** ג€” a ג‚×29/month "Family" tier duplicating most of Plus's features. Merged its perks into the single approved ג‚×19/month plan and simplified the page to two tiers.

3. **Broken WhatsApp link on the contact page.** `wa.me/972` has no phone number after it, so it opened to nothing ג€” confirmed broken on the live site. No real business number exists to put there, so I removed the card instead of guessing. **Flag for you:** if you want WhatsApp on that page, I need a real number.

4. **Dead code holding fake customer reviews.** A component with three invented names, quotes, and star ratings was sitting in the code (already hidden on the live page, but one accidental change away from reappearing). Deleted it outright, along with an unused duplicate FAQ block and some now-unused code that removal exposed.

**Evidence:** TypeScript clean, ESLint clean on every file I touched (confirmed the 46 pre-existing lint errors elsewhere in the repo are all in files owned by other worktrees, not mine), all 517 tests pass, and the production build succeeds with all marketing pages rendering. GEO score on the live site (baseline, before this merges): 100/100 via the self-contained scanner.

**Left over, not fixed:** three marketing images (og-image, hero, app-mockup) are 330ג€“530KB each ג€” heavier than ideal ג€” but I had no image-compression tool available in this environment to safely shrink them. Worth running through a compressor before the next asset refresh.

No changes touched the logged-in app, the API/sync logic, the database, or the terms/privacy pages, per the brief. Nothing was merged or deployed ג€” that's your call.</result>
<usage><subagent_tokens>293983</subagent_tokens><tool_uses>94</tool_uses><duration_ms>1174145</duration_ms></usage>
</task-notification> [884717c7ab90ce16]
