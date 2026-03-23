# Google OAuth Verification Guide for BayitBeSeder

**Last Updated:** March 2026
**App Domain:** bayitbeseder.com
**Auth Provider:** Supabase Auth (Google OAuth)

---

## Table of Contents

1. [Current State](#current-state)
2. [Scope Analysis](#scope-analysis)
3. [Pre-requisites Checklist](#pre-requisites-checklist)
4. [Step-by-Step Verification Process](#step-by-step-verification-process)
5. [Privacy Policy Requirements](#privacy-policy-requirements)
6. [Terms of Service Requirements](#terms-of-service-requirements)
7. [Demo Video Requirements](#demo-video-requirements)
8. [Estimated Timeline](#estimated-timeline)
9. [Common Rejection Reasons](#common-rejection-reasons)
10. [If Rejected — What To Do](#if-rejected--what-to-do)
11. [Israeli-Specific Considerations](#israeli-specific-considerations)
12. [Google Calendar Scope — Separate Verification](#google-calendar-scope--separate-verification)
13. [Sources](#sources)

---

## Current State

BayitBeSeder currently uses Google OAuth via Supabase Auth for login. The Google Cloud project is in **"Testing" mode**, meaning only manually added test users can sign in. To allow any Google user to log in, we need to go through verification.

### What We Use

| Feature | Scopes | Classification |
|---------|--------|----------------|
| Google Sign-In (via Supabase) | `openid`, `email`, `profile` | **Non-sensitive** |
| Google Calendar integration | `calendar.events` | **Sensitive** |

---

## Scope Analysis

This is the most important section — it determines how much verification work is needed.

### Path A: Sign-In Only (openid, email, profile)

If we only need Google Sign-In (which is what Supabase Auth uses by default), the scopes are **non-sensitive**:

- `openid` — non-sensitive
- `https://www.googleapis.com/auth/userinfo.email` — non-sensitive
- `https://www.googleapis.com/auth/userinfo.profile` — non-sensitive

**For non-sensitive scopes only, you do NOT need full OAuth verification.** You only need **brand verification** (lighter process) to display your app name and logo on the consent screen. Without brand verification, users see an "unverified app" warning but CAN still proceed.

**Recommendation:** Start with Path A. Get brand verification for sign-in first, then add Calendar scopes later.

### Path B: Sign-In + Google Calendar

The Google Calendar scope used in `src/lib/google-calendar.ts`:

```
https://www.googleapis.com/auth/calendar.events
```

This is classified as a **sensitive scope**. It requires:
- Full OAuth verification
- Privacy policy
- Demo video
- Justification for scope usage
- Longer review process

### Recommended Strategy

1. **Phase 1:** Brand verification with non-sensitive scopes only (sign-in). Takes 2-3 business days.
2. **Phase 2:** Add Calendar scope and submit for sensitive scope verification. Takes 3-6 weeks.

---

## Pre-requisites Checklist

Complete ALL of these before submitting for verification:

### Domain & Hosting

- [ ] **bayitbeseder.com is live and accessible** — must show a real homepage
- [ ] **Domain ownership verified in Google Search Console** — add bayitbeseder.com
- [ ] **Supabase domain added to authorized domains** — `<project-id>.supabase.co`
- [ ] **SSL/HTTPS enabled** — must be HTTPS (Vercel handles this)

### Homepage Requirements

- [ ] **Homepage describes the app's functionality** — what it does, who it's for
- [ ] **Privacy Policy link visible on homepage** — footer link to `/privacy`
- [ ] **Terms of Service link visible on homepage** (recommended) — footer link to `/terms`
- [ ] **App name matches** what's configured in Google Cloud Console

### Google Cloud Console Setup

- [ ] **Google Cloud Project exists** with OAuth credentials
- [ ] **OAuth consent screen configured** with:
  - App name: "BayitBeSeder" (or "בית בסדר")
  - User support email: your email
  - App logo: BayitBeSeder logo (120x120px, PNG/JPEG)
  - App homepage: `https://bayitbeseder.com`
  - Privacy policy URL: `https://bayitbeseder.com/privacy`
  - Terms of service URL: `https://bayitbeseder.com/terms`
  - Authorized domains: `bayitbeseder.com`, `supabase.co`
  - Developer contact email: your email
- [ ] **Scopes declared correctly** — only the scopes you actually use
- [ ] **OAuth client ID configured** with correct redirect URIs

### Pages to Create

- [ ] **Privacy Policy page** (`/privacy`) — see requirements below
- [ ] **Terms of Service page** (`/terms`) — see requirements below

### For Calendar Scope (Phase 2 only)

- [ ] **Demo video recorded** and uploaded to YouTube (unlisted)
- [ ] **Written justification** for why you need calendar.events scope

---

## Step-by-Step Verification Process

### Step 1: Verify Domain Ownership

1. Go to [Google Search Console](https://search.google.com/search-console)
2. Add property: `bayitbeseder.com`
3. Choose DNS verification method
4. Add the TXT record to Cloudflare DNS:
   - Go to Cloudflare Dashboard > bayitbeseder.com > DNS
   - Add TXT record with the value Google provides
   - Wait for propagation (usually 5-15 minutes with Cloudflare)
5. Return to Search Console and click "Verify"

### Step 2: Create Privacy Policy & Terms of Service Pages

Create `/privacy` and `/terms` pages on bayitbeseder.com (see sections below for content requirements).

### Step 3: Configure OAuth Consent Screen

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select the BayitBeSeder project
3. Navigate to **APIs & Services > OAuth consent screen**
4. Fill in all fields:
   - **App name:** BayitBeSeder
   - **User support email:** your email
   - **App logo:** upload your logo
   - **App home page:** `https://bayitbeseder.com`
   - **App privacy policy link:** `https://bayitbeseder.com/privacy`
   - **App terms of service link:** `https://bayitbeseder.com/terms`
   - **Authorized domains:** `bayitbeseder.com`
   - **Developer contact information:** your email
5. Add scopes:
   - Phase 1: `openid`, `email`, `profile` only
   - Phase 2: add `https://www.googleapis.com/auth/calendar.events`

### Step 4: Publish to Production

1. On the OAuth consent screen page, click **"Publish App"**
2. Confirm the dialog — this moves your app from "Testing" to "Production"
3. **Important:** After publishing, the "unverified app" warning will show to users until verification completes. Users can still proceed by clicking "Advanced" > "Go to BayitBeSeder (unsafe)" — but this is not ideal for trust.

### Step 5: Submit for Brand Verification

1. After publishing, click **"Prepare for Verification"**
2. Review all information is correct
3. Click **"Submit for Verification"**
4. Google will send an email asking you to verify domain ownership (if not already done)
5. Wait for brand verification (2-3 business days)

### Step 6: Submit for Sensitive Scope Verification (Phase 2 — Calendar)

Only after brand verification is complete:

1. Add the `calendar.events` scope to your consent screen configuration
2. Click **"Prepare for Verification"** again
3. Provide:
   - **Justification:** "BayitBeSeder syncs household chore schedules to users' Google Calendar so they get reminders for assigned tasks. We use calendar.events to create, update, and delete task events."
   - **YouTube demo video link** (see video requirements below)
4. Click **"Submit for Verification"**
5. Wait for review (3-5 business days for sensitive scopes, up to 4-6 weeks)

### Step 7: Respond to Google's Questions

- Google may email follow-up questions within 3-5 days
- Respond promptly and thoroughly — delays here extend the process
- Common questions: "Why do you need this scope?", "Can you use a less permissive scope?"

---

## Privacy Policy Requirements

Your privacy policy MUST include all of the following to pass verification. Host it at `https://bayitbeseder.com/privacy`.

### Required Sections

1. **What data you collect**
   - Google account data: name, email, profile picture
   - For Calendar: calendar event data (titles, dates, times)
   - App-specific data: tasks, completions, shopping lists, household info

2. **How you use Google user data**
   - Authentication and account creation
   - Displaying user profile in the app
   - Calendar sync (Phase 2): creating task reminders in the user's calendar
   - **Must explicitly state:** "Google user data is used solely to provide and improve app functionality"

3. **How you store Google user data**
   - Stored in Supabase (PostgreSQL) with encryption at rest
   - OAuth tokens stored securely in the database
   - Data retention: as long as user account is active

4. **How you share Google user data**
   - **Must state:** "We do not sell Google user data to third parties"
   - **Must state:** "We do not use Google user data for advertising"
   - **Must state:** "We do not transfer Google user data to third parties except as necessary to provide the app's functionality"
   - Only share with: Supabase (database provider), Vercel (hosting provider)

5. **How users can delete their data**
   - How to request account deletion
   - What happens to their data when deleted
   - Contact email for deletion requests

6. **Data security measures**
   - HTTPS encryption in transit
   - Database encryption at rest
   - Access controls and authentication

7. **Contact information**
   - Email address for privacy questions
   - Physical address (recommended for Israeli compliance, see below)

8. **Google API Services User Data Policy compliance**
   - Add this statement: "BayitBeSeder's use and transfer of information received from Google APIs adheres to the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), including the Limited Use requirements."

### Privacy Policy Template (Hebrew + English)

Since the app is in Hebrew but Google reviewers read English, consider:
- **Option A:** English privacy policy (easier for Google verification)
- **Option B:** Bilingual (Hebrew primary with English translation) — recommended for Israeli users + Google compliance
- **Option C:** Two separate pages — Hebrew for users, English linked for Google

**Recommendation:** Option B — bilingual page. Google reviewers will check the English version. Israeli users get Hebrew.

---

## Terms of Service Requirements

Terms of service are not strictly required for OAuth verification but are strongly recommended. Host at `https://bayitbeseder.com/terms`.

### Recommended Sections

1. **Service description** — what BayitBeSeder does
2. **User responsibilities** — acceptable use
3. **Account terms** — one account per person, age requirements
4. **Data and privacy** — link to privacy policy
5. **Intellectual property** — who owns the content
6. **Limitations of liability** — standard disclaimers
7. **Termination** — how accounts can be closed
8. **Changes to terms** — how updates are communicated
9. **Governing law** — State of Israel (see Israeli section below)
10. **Contact information**

---

## Demo Video Requirements

A demo video is required for **sensitive scope verification** (Calendar). It is NOT required for brand verification with non-sensitive scopes only.

### What to Show

1. **App homepage** — show bayitbeseder.com with privacy policy link
2. **Sign-in flow** — click "Sign in with Google", show the consent screen
3. **Consent screen** — must show:
   - App name matches what's in Google Cloud Console
   - Scopes being requested are visible
   - Browser URL bar shows your OAuth client ID
4. **Calendar integration flow** (for Phase 2):
   - Show user connecting their calendar
   - Show a task being synced to Google Calendar
   - Show the calendar event in Google Calendar
5. **Data usage** — briefly show how the data is used in the app

### Technical Requirements

- Upload to **YouTube** as **Unlisted**
- Must be in **English** (narration or on-screen text)
- Show the **full OAuth flow** from start to finish
- **Important:** Revoke your own consent before recording so the consent screen actually appears (Google skips it if you've already granted access). To revoke:
  1. Go to https://myaccount.google.com/permissions
  2. Find BayitBeSeder
  3. Click "Remove Access"
  4. Wait 5-10 minutes for propagation
  5. Then record the demo

### Recording Tips

- Use screen recording software (OBS, Loom, or built-in screen recorder)
- Keep it under 5 minutes
- No need for professional editing — just clear and complete
- Show browser URL bar throughout

---

## Estimated Timeline

### Phase 1: Brand Verification (Non-Sensitive Scopes)

| Step | Duration |
|------|----------|
| Prepare privacy policy + terms pages | 1-2 days |
| Verify domain in Google Search Console | 1 day (DNS propagation) |
| Configure consent screen | 30 minutes |
| Publish app + submit for verification | 10 minutes |
| Google review | **2-3 business days** |
| **Total Phase 1** | **~1 week** |

### Phase 2: Sensitive Scope Verification (Calendar)

| Step | Duration |
|------|----------|
| Record and upload demo video | 1 day |
| Write scope justification | 30 minutes |
| Submit for sensitive scope verification | 10 minutes |
| Google review | **3-5 business days** (can take up to 4-6 weeks) |
| Respond to follow-up questions | 1-3 days |
| **Total Phase 2** | **1-6 weeks** |

### Worst-Case Scenarios

- Rejection + resubmission: add 2-3 weeks per round
- Some developers report being stuck in review for 1-2+ months
- Incomplete documentation is the #1 cause of delays

---

## Common Rejection Reasons

### 1. Incomplete or Missing Privacy Policy

**Problem:** Privacy policy doesn't mention Google user data specifically.
**Fix:** Add explicit section about how Google user data (name, email, profile photo, calendar data) is collected, used, stored, and shared.

### 2. Privacy Policy Not on Homepage

**Problem:** Homepage doesn't link to the privacy policy, or the privacy policy URL doesn't match what's in the consent screen.
**Fix:** Add a visible footer link on bayitbeseder.com to `/privacy`. Ensure the URL matches exactly.

### 3. Domain Not Verified

**Problem:** bayitbeseder.com ownership not confirmed in Google Search Console.
**Fix:** Complete DNS verification before submitting.

### 4. App Name Mismatch

**Problem:** App name in Google Cloud Console doesn't match what's shown on the website.
**Fix:** Use "BayitBeSeder" consistently everywhere.

### 5. Insufficient Scope Justification

**Problem:** "I need calendar access" is not enough.
**Fix:** Explain specifically: "We create calendar events for household chores assigned to users so they receive Google Calendar reminders. We read events to check for conflicts. We update events when task schedules change. We delete events when tasks are removed."

### 6. Data Transfer to Third Parties

**Problem:** Privacy policy mentions sharing data with analytics, advertising, or unrelated third parties.
**Fix:** Only mention necessary service providers (Supabase for database, Vercel for hosting). Do NOT mention Google Analytics data collection of Google user data.

### 7. Demo Video Issues

**Problem:** Video doesn't show the consent screen, or consent is already granted (screen is skipped).
**Fix:** Revoke access at myaccount.google.com/permissions, wait, then re-record.

### 8. Requesting Unnecessary Scopes

**Problem:** Requesting broader scopes than needed (e.g., full `calendar` instead of `calendar.events`).
**Fix:** Use the most restrictive scope possible. We use `calendar.events` which is already scoped down from full calendar access. Consider `calendar.events.readonly` if we only read.

---

## If Rejected — What To Do

1. **Read the rejection email carefully** — Google specifies exactly what's wrong
2. **Fix the specific issue** — don't change anything else
3. **Resubmit** — go back to the consent screen page and resubmit
4. **Response time:** Google typically re-reviews within 3-5 business days
5. **If stuck:** Post on the [Google Developer Community forums](https://discuss.google.dev/) with your case details
6. **Escalation:** There is no official escalation path, but persistent forum posts sometimes get Google employee attention

### Tips for Faster Resubmission

- Address every point in the rejection email
- Be thorough in your response — don't leave anything ambiguous
- Update the privacy policy if that was the issue and provide the updated URL
- Re-record the demo video if that was the issue

---

## Israeli-Specific Considerations

### Privacy Protection Law (חוק הגנת הפרטיות)

Israel has the **Privacy Protection Law, 5741-1981** and associated regulations. While Google's verification process doesn't specifically check Israeli law compliance, your privacy policy should comply with local law:

1. **Database Registration:** If you store personal data of Israeli residents, you may need to register your database with the **Privacy Protection Authority (הרשות להגנת הפרטיות)**. For small apps with basic user data, this is often not enforced, but be aware of the requirement.

2. **Consent Requirements:** Israeli law requires informed consent for data collection. Your privacy policy and consent screen satisfy this.

3. **Data Transfer Abroad:** Since Supabase servers may be outside Israel, mention that data may be stored on servers outside Israel. Israel is recognized by the EU as having adequate data protection (EU adequacy decision), which helps.

4. **Right to Access and Deletion:** Israeli law grants users the right to access and delete their personal data. Include this in your privacy policy.

5. **Contact Details:** Include a physical address or at minimum a valid contact email for privacy inquiries. Israeli regulations favor having a local contact.

### Language Considerations

- Google reviewers read **English** — your privacy policy must be available in English
- Israeli users expect **Hebrew** — consider bilingual
- The app name "BayitBeSeder" works in English; you can add "בית בסדר" in parentheses

### EU GDPR Note

Israel has EU adequacy status, and many Israeli apps also comply with GDPR as best practice. If you plan to have any EU users, consider adding GDPR-required sections (lawful basis for processing, DPO contact, etc.).

---

## Google Calendar Scope — Separate Verification

### Current Implementation

The file `src/lib/google-calendar.ts` uses:

```
https://www.googleapis.com/auth/calendar.events
```

This is a **sensitive scope** (not restricted). It allows creating, reading, updating, and deleting calendar events.

### Does It Need Separate Verification?

**No, it's not a separate verification** — it's part of the same OAuth consent screen verification. However:

- It elevates the verification from "brand only" to "sensitive scope" verification
- It requires a demo video
- It requires written justification
- The review takes longer

### Consider Using a Narrower Scope

If the app only needs to **create** events (push task schedules to Calendar):

| Scope | Access | Classification |
|-------|--------|----------------|
| `calendar.events` | Read + Write events | Sensitive |
| `calendar.events.readonly` | Read-only events | Sensitive |
| `calendar.events.owned` | Read + Write events the app created | Sensitive |
| `calendar.events.owned.readonly` | Read-only events the app created | Sensitive |

**Recommendation:** Use `calendar.events.owned` if you only need to manage events that BayitBeSeder created. This limits access and strengthens your justification.

### Annual Re-verification

Calendar scopes are sensitive (not restricted), so they do **not** require annual re-verification. Annual re-verification only applies to **restricted** scopes (like full Gmail access).

---

## Quick Action Plan

### This Week

1. Create `/privacy` page on bayitbeseder.com (bilingual Hebrew/English)
2. Create `/terms` page on bayitbeseder.com
3. Add footer links to both pages on the homepage
4. Verify `bayitbeseder.com` in Google Search Console (DNS TXT record via Cloudflare)

### Next Week

5. Configure OAuth consent screen with all details
6. Publish app from "Testing" to "Production"
7. Submit for brand verification (non-sensitive scopes only)
8. Wait for brand verification (2-3 business days)

### After Brand Verification

9. Record demo video showing Calendar integration flow
10. Upload to YouTube (unlisted)
11. Add Calendar scope and resubmit for sensitive scope verification
12. Respond to any Google follow-up questions

### After Full Verification

13. Remove test user restrictions — anyone can sign in
14. Update app store listing (if applicable)
15. Announce to users

---

## Sources

- [Google OAuth App Verification Help Center](https://support.google.com/cloud/answer/13463073?hl=en)
- [Brand Verification — Google for Developers](https://developers.google.com/identity/protocols/oauth2/production-readiness/brand-verification)
- [Sensitive Scope Verification — Google for Developers](https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification)
- [Verification Requirements — Google Cloud](https://support.google.com/cloud/answer/13464321?hl=en)
- [OAuth 2.0 Policies — Google for Developers](https://developers.google.com/identity/protocols/oauth2/policies)
- [Policy Compliance — Google for Developers](https://developers.google.com/identity/protocols/oauth2/production-readiness/policy-compliance)
- [Demo Video Requirements — Google Cloud](https://support.google.com/cloud/answer/13804565?hl=en)
- [App Privacy Policy — Google Cloud](https://support.google.com/cloud/answer/13806988?hl=en)
- [Google Calendar API Scopes — Google for Developers](https://developers.google.com/workspace/calendar/api/auth)
- [OAuth 2.0 Scopes for Google APIs — Google for Developers](https://developers.google.com/identity/protocols/oauth2/scopes)
- [Supabase Google OAuth Docs](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Google OAuth Verification Walkthrough (2024)](https://ryanschiang.com/google-oauth-verification-what-to-expect)
- [Google OAuth Verification Costs & Timelines — Nylas](https://www.nylas.com/blog/google-oauth-app-verification/)
- [Privacy Policy for Google OAuth — iubenda](https://www.iubenda.com/en/help/18852-privacy-policy-google-oauth/)
- [How to Make an OAuth Demo Video — CloudSponge](https://medium.com/cloudsponge/how-to-correctly-make-an-oauth-demo-video-for-google-verification-5bc12d34b8ec)
- [Google Privacy Policy Requirements — CloudSponge](https://www.cloudsponge.com/developer/oauth/oauth-credentials/google/privacy-policy-requirements/)
