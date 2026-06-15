# Discount Club Registration & Booking System
## Requirements & Technical Specification

**Project Name:** Discount Club Code  
**Client:** Todd Ogryzlo  
**Domains:** discountbnbclub.com & homestayclub.ca  
**Tech Stack:** Next.js 14+, React 18+, MongoDB, Vercel, Nodemailer/SendGrid  
**Status:** MVP - Lean Implementation  

---

## 1. Project Overview

A lightweight, two-domain registration and booking system where users:
1. Register via email to receive a verification code
2. Can only access the "Book" button after verification
3. Submit booking requests that trigger email notifications

**Core Philosophy:** No traditional user accounts. Simple email-based proof of registration. Minimal features, maximum simplicity.

---

## 2. User Flows

### Flow 1: Registration → Verification → Booking

```
User visits site
  ↓
User clicks "Register" button
  ↓
User enters email address (simple form)
  ↓
System generates random code (6 digits)
  ↓
Email sent to user with code
Email sent to Todd (snssoftware1@gmail.com or info@snssoftware.ca)
  ↓
User receives code in email
  ↓
User enters code in verification input
  ↓
System verifies code
  ↓
"Book" button becomes enabled/visible
  ↓
User clicks "Book"
  ↓
Booking submitted → Toast: "Your submission has been sent"
  ↓
Email notification sent to Todd (NO copy of booking to user)
  ↓
Process complete
```

### Flow 2: Email Registration Notification (to Todd)

**Subject:** New Registration - [Domain Name]  
**Content:**
```
New registration received:
Email: [user_email]
Domain: [discountbnbclub.com or homestayclub.ca]
Timestamp: [ISO timestamp]
Code sent: [code]
```

### Flow 3: Booking Submission Notification (to Todd)

**Subject:** New Booking Submission - [Domain Name]  
**Content:**
```
New booking submitted:
Email: [user_email]
Domain: [discountbnbclub.com or homestayclub.ca]
Timestamp: [ISO timestamp]
[Any additional data user provided during booking]
```

---

## 3. Core Features

### 3.1 Register Button & Flow
- **Trigger:** Click "Register" button on homepage
- **UI:** Simple modal or page with email input
- **Validation:** Email format only (RFC 5322 simplified)
- **Action:** 
  - Generate 6-digit code
  - Save email + code to MongoDB with 30-min TTL
  - Send email to user with code
  - Send registration log to Todd's email
  - Show user message: "Check your email for verification code"

### 3.2 Verification Input
- **Trigger:** After user clicks "Register"
- **UI:** Input field for 6-digit code (or paste-friendly)
- **Validation:** Match against stored code, check expiry (30 minutes)
- **Success:** 
  - Mark email as verified (session/state)
  - Show success toast
  - Enable "Book" button
- **Failure:** Show error, allow retry

### 3.3 Book Button
- **Initial State:** Disabled/grayed out until verification complete
- **Active State:** Clickable once email verified
- **UI:** Single button, visually distinct
- **Action on Click:**
  - Open booking form (can be same button, opens modal/form)
  - User submits booking data
  - Send confirmation: "Your submission has been sent"
  - Trigger email to Todd (NOT to user)
  - Clear session state (optional: ask what happens on refresh)

### 3.4 Booking Form (Minimal)
- Email (pre-filled from registration)
- Optional: Any additional fields Todd wants (TBD - keep minimal for MVP)
- Submit button: "Submit Booking"

---

## 4. Database Schema (MongoDB)

### Collection: `registrations`
```javascript
{
  _id: ObjectId,
  email: String,              // user email
  code: String,               // 6-digit verification code
  domain: String,             // "discountbnbclub.com" or "homestayclub.ca"
  verified: Boolean,          // true after code verified
  createdAt: Date,            // timestamp
  expiresAt: Date,            // TTL index: 30 minutes from creation
  verifiedAt: Date,           // timestamp when code verified
}
```

### Collection: `bookings`
```javascript
{
  _id: ObjectId,
  email: String,
  domain: String,
  submittedAt: Date,
  bookingData: Object,        // any additional form data
  status: String,             // "pending" | "approved" | "rejected" (for future use)
}
```

**Indexes:**
- `registrations`: TTL on `expiresAt` (30 min), unique on `{email, domain}`
- `bookings`: compound index on `{email, domain, submittedAt}`

---

## 5. API Endpoints (Next.js)

### POST /api/register
**Request:**
```json
{
  "email": "user@example.com",
  "domain": "discountbnbclub.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Verification code sent to your email"
}
```

**Response (400):**
```json
{
  "success": false,
  "message": "Invalid email format" | "Rate limited" | "Database error"
}
```

**Side Effects:**
- Save to `registrations` collection
- Send email to user with code
- Send registration notification to Todd

---

### POST /api/verify
**Request:**
```json
{
  "email": "user@example.com",
  "code": "123456",
  "domain": "discountbnbclub.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Email verified",
  "sessionToken": "abc123xyz..."  // Or use HTTP-only cookie
}
```

**Response (400):**
```json
{
  "success": false,
  "message": "Invalid code" | "Code expired" | "Email not found"
}
```

**Side Effects:**
- Mark registration as verified in DB
- Return session token or set secure cookie

---

### POST /api/booking
**Request:**
```json
{
  "email": "user@example.com",
  "domain": "discountbnbclub.com",
  "sessionToken": "abc123xyz...",
  "bookingData": {}  // optional additional fields
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Your submission has been sent"
}
```

**Response (400):**
```json
{
  "success": false,
  "message": "Not verified" | "Session expired" | "Invalid email"
}
```

**Side Effects:**
- Save booking to `bookings` collection
- Send email to Todd (snssoftware1@gmail.com, info@snssoftware.ca)
- DO NOT send email to user

---

## 6. Frontend Components (React/Next.js)

### Pages
- `pages/index.tsx` — Main landing page (shows Register & Book buttons)
- `pages/[domain].tsx` — Multi-tenant route handler (if needed for domain routing)

### Components
- `<RegisterModal />` — Email input + submission
- `<VerificationModal />` — Code input + verification
- `<BookingForm />` — Booking submission form
- `<Toast />` — Success/error notifications

### State Management
- Use React Context or localStorage for session verification
- Store verified email + domain in session
- Clear on page refresh (or persist with secure token)

---

## 7. Multi-Tenancy Strategy

### Approach: Environment-based + Domain Parameter

1. **Same codebase for both domains**
2. **Detect domain at runtime:**
   ```javascript
   const domain = req.headers.host.includes('homestayclub.ca') 
     ? 'homestayclub.ca' 
     : 'discountbnbclub.com';
   ```
3. **Store `domain` on every registration/booking record**
4. **DNS:** Both domains point to same Vercel deployment
5. **Email branding:** Can be domain-aware in templates (optional for MVP)

---

## 8. Email Configuration

### Email Provider: Nodemailer or SendGrid

**Credentials to be provided by Todd:**
- SMTP server OR SendGrid API key
- Email address for sending
- Support email addresses (snssoftware1@gmail.com, info@snssoftware.ca)

### Email Templates

#### Template 1: User Registration Code
```
Subject: Your Verification Code

Hi,

Your verification code is: [CODE]

This code expires in 30 minutes.

If you didn't request this, please ignore this email.

Best regards,
[Domain Name] Team
```

#### Template 2: Todd Registration Notification
```
Subject: New Registration - [DOMAIN]

New registration:
Email: [USER_EMAIL]
Domain: [DOMAIN]
Time: [TIMESTAMP]

Code sent to user.
```

#### Template 3: Todd Booking Notification
```
Subject: New Booking - [DOMAIN]

New booking submission:
Email: [USER_EMAIL]
Domain: [DOMAIN]
Time: [TIMESTAMP]

[Any additional booking data]
```

---

## 9. Technical Implementation Details

### Authentication Strategy
- **No JWT/traditional auth** — Use simple session token or HTTP-only cookie
- **Session TTL:** 24 hours (user can stay verified for a day, can register again if needed)
- **Verification code TTL:** 30 minutes (strict, no infinite codes)

### Rate Limiting
- Prevent code spam: Max 3 registration attempts per email per hour
- Prevent verification spam: Max 5 code verification attempts per email
- Use MongoDB TTL or in-memory cache for tracking

### Error Handling
- Catch all DB errors, return generic "Database error" to client (don't expose internals)
- Log all errors server-side for debugging
- Return 400 for client errors, 500 for server errors

### Security
- **CORS:** Allow both domains
- **HTTPS Only:** Enforced on Vercel (default)
- **HTTP-only Cookies:** For session tokens (if using cookies)
- **CSRF Protection:** Add if using forms (POST endpoints)
- **Email Validation:** Simple regex, optional confirmation

### Performance
- MongoDB connection pooling (handled by Mongoose/native driver)
- API response time target: <200ms
- Email sending: Fire-and-forget (don't block response)

---

## 10. Deployment (Vercel)

### Environment Variables
```
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname
EMAIL_SERVICE=sendgrid OR smtp (TBD)
EMAIL_FROM=noreply@discountclub.com
TODD_EMAIL_1=snssoftware1@gmail.com
TODD_EMAIL_2=info@snssoftware.ca
NEXT_PUBLIC_DOMAIN_1=discountbnbclub.com
NEXT_PUBLIC_DOMAIN_2=homestayclub.ca
```

### Vercel Config
- Build command: `next build`
- Output directory: `.next`
- Install command: `npm install`
- Functions: API routes auto-detected
- Serverless: Default (12s timeout for Hobby, 60s for Pro)

### DNS
- `discountbnbclub.com` → Vercel nameservers
- `homestayclub.ca` → Vercel nameservers
- Both domains point to same deployment

---

## 11. Testing Strategy (for Claude AI context)

### Unit Tests
- `verify-email()` function
- `generate-code()` function
- Code expiry logic

### Integration Tests
- `/api/register` endpoint with valid/invalid emails
- `/api/verify` endpoint with valid/expired codes
- `/api/booking` endpoint with/without verification
- Email sending (mock SendGrid)

### Manual Testing Checklist
- [ ] Register on domain 1, verify, book
- [ ] Register on domain 2, verify, book
- [ ] Cross-check: Can't book without verification
- [ ] Code expiry after 30 mins
- [ ] Emails arrive to Todd
- [ ] User sees toast messages
- [ ] Refresh page — session persists
- [ ] Mobile responsive (small screen)

---

## 12. Future Enhancements (NOT MVP)

- Automated calendar display (Todd mentioned, too complex for now)
- Admin panel to approve/reject bookings
- PDF export of bookings
- User account dashboard
- Payment integration
- Analytics / reporting

---

## 13. Success Criteria

✅ **MVP Complete when:**
1. Register button works, sends code via email
2. User can verify code and unlock Book button
3. Book button submits, sends confirmation to Todd
4. Both domains work identically
5. No user account needed (stateless except for 24-hour session)
6. Deployed and live on both domains
7. Todd receives emails as expected

---

## 14. Questions to Clarify Before Building

1. **Email sending:** Which email service does Todd use? (SMTP creds, SendGrid API key?)
2. **Booking form fields:** Beyond email, does Todd want users to input anything? (Name, phone, dates, etc.?)
3. **Multiple bookings:** Can the same email register/book multiple times?
4. **Session persistence:** Should verified state persist after page refresh? (Recommend: yes, 24 hours)
5. **UI/Branding:** Color scheme, logo, domain-specific copy?
6. **Domain-specific email templates:** Different text for BNB vs Homestay?

---

## 15. File Structure (Next.js)

```
discount-club/
├── pages/
│   ├── index.tsx           # Main landing page
│   ├── api/
│   │   ├── register.ts     # POST /api/register
│   │   ├── verify.ts       # POST /api/verify
│   │   ├── booking.ts      # POST /api/booking
│   │   └── health.ts       # GET /api/health (optional)
├── components/
│   ├── RegisterModal.tsx
│   ├── VerificationModal.tsx
│   ├── BookingForm.tsx
│   ├── Toast.tsx
├── lib/
│   ├── mongodb.ts          # DB connection
│   ├── email.ts            # Email sending
│   ├── validation.ts       # Email, code validation
│   ├── rate-limit.ts       # Rate limiting
├── models/
│   ├── registration.ts     # DB schema
│   ├── booking.ts          # DB schema
├── public/
│   └── [assets]
├── styles/
│   └── globals.css
├── .env.local              # Local dev secrets
├── vercel.json             # Vercel config
├── package.json
└── tsconfig.json
```

---

## 16. Commands for Development

```bash
# Install
npm install

# Dev
npm run dev
# Visit http://localhost:3000

# Build
npm run build

# Deploy to Vercel
vercel deploy

# Test
npm test
```

---

## Notes for Claude AI (VS Code Extension)

When building this with Claude AI, provide these files one at a time or in logical groups:
1. **Database & Models** — Setup MongoDB schemas first
2. **API Routes** — `/api/register`, `/api/verify`, `/api/booking`
3. **Utilities** — Email, validation, rate limiting
4. **Components** — React components for UI
5. **Pages** — Main landing page with all components
6. **Config** — `.env.local`, `vercel.json`, `package.json`

Ask Claude AI for:
- Error handling improvements
- Security suggestions
- Performance optimizations
- Testing code

Keep requests **focused and incremental** — don't ask for the entire app at once.

---

**Document Version:** 1.0  
**Last Updated:** June 15, 2026  
**Status:** Ready for Implementation
