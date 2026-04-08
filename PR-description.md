# Pull Request: Add Signup and Signin Pages with Authentication

## Summary
Added complete authentication system with Signup and Signin pages to the expense tracker frontend, including backend API endpoints, validation, and full user experience features.

## Changes Made

### Frontend (`/frontend/src`)

**New Pages:**
- `pages/Signup.tsx` - Full registration form with validation and password strength meter
- `pages/Signin.tsx` - Login form with remember me functionality
- `pages/Dashboard.tsx` - Protected dashboard page (moved from App.tsx)
- `pages/Home.tsx` - Landing page with feature highlights

**New Components:**
- `components/Input.tsx` - Reusable text input with validation
- `components/PasswordInput.tsx` - Password input with show/hide toggle
- `components/PasswordStrengthMeter.tsx` - Visual password strength indicator
- `components/FormError.tsx` - Error banner for server-side errors

**New Utilities:**
- `utils/validation.ts` - Client-side validation functions (email, password, phone, name)
- `utils/auth.ts` - Authentication API calls and token management

**Routing:**
- Updated `App.tsx` to use React Router with protected routes
- Updated `main.tsx` to wrap app in BrowserRouter
- Routes: `/` (home), `/signup`, `/signin`, `/dashboard`

**Styling:**
- Updated `index.css` with fadeIn animation
- All components use existing Tailwind configuration

**Testing:**
- `__tests__/validation.test.ts` - Unit tests for all validation functions
- `e2e-tests.md` - Complete E2E test plan with 10 scenarios

### Backend (`/Prophet_/app.py`)

**New Endpoints:**
- `POST /api/auth/signup` - User registration (201 on success, 400 if email exists)
- `POST /api/auth/login` - User authentication (200 on success, 401 on invalid credentials)

**Implementation Notes:**
- Uses in-memory storage (replace with database in production)
- Returns JWT-style tokens (TODO: implement proper JWT)
- Passwords stored in plain text (TODO: add bcrypt hashing)
- Proper error responses with field-level validation

### Dependencies Added
- `react-router-dom@7.9.6` - Client-side routing
- `vitest@4.0.12` - Unit testing framework
- `@vitest/ui` - Vitest UI for test visualization
- `email-validator@2.3.0` - Email validation for Pydantic (backend)

## Features

### User Experience
- ✅ Mobile-first responsive design
- ✅ Real-time inline validation
- ✅ Password strength meter (weak/medium/strong)
- ✅ Show/hide password toggles
- ✅ Loading states during API calls
- ✅ Success animations before redirect
- ✅ Clear error messages for all failure scenarios
- ✅ Network error handling with retry capability

### Accessibility
- ✅ All inputs properly labeled with `for`/`id` linking
- ✅ Error messages connected via `aria-describedby`
- ✅ `role="alert"` for server error banners
- ✅ Keyboard navigation with proper focus states
- ✅ Sufficient color contrast (WCAG AA compliant)

### Validation Rules
**Signup:**
- Name: Required, min 2 characters
- Email: Required, valid format
- Password: Required, min 8 chars, must include letter + number
- Confirm Password: Must match password
- Phone: Optional, numeric only (10-15 digits)

**Signin:**
- Email: Required, valid format
- Password: Required

### Security (TODO for Production)
- [ ] Hash passwords with bcrypt
- [ ] Implement proper JWT tokens
- [ ] Add database storage (PostgreSQL/MongoDB)
- [ ] Add rate limiting on auth endpoints
- [ ] Add CSRF protection
- [ ] Implement password reset flow
- [ ] Add email verification

## Testing

**Unit Tests:**
```bash
cd frontend
npm test
```

**E2E Tests:**
See `frontend/e2e-tests.md` for complete test scenarios. Ready for Cypress/Playwright implementation.

## API Contract

### Signup - `POST /api/auth/signup`
**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "phone": "1234567890"
}
```

**Success (201):**
```json
{
  "user": { "id": "abc123", "name": "John Doe", "email": "john@example.com" },
  "token": "secure-token-here"
}
```

**Error (400):**
```json
{
  "message": "Email already exists",
  "errors": { "email": "This email is already registered" }
}
```

### Login - `POST /api/auth/login`
**Request:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123",
  "remember": true
}
```

**Success (200):**
```json
{
  "user": { "id": "abc123", "name": "John Doe", "email": "john@example.com" },
  "token": "secure-token-here"
}
```

**Error (401):**
```json
{
  "message": "Invalid credentials"
}
```

## Token Storage
Currently using `localStorage` with key `expense_token`. If backend implements httpOnly cookies, frontend can be easily adapted by removing localStorage calls in `utils/auth.ts`.

## How to Test

1. Start backend: `cd Prophet_ && source venv/bin/activate && python app.py`
2. Start frontend: `cd frontend && npm run dev`
3. Visit `http://localhost:5173`
4. Test signup flow with new account
5. Test signin flow with created account
6. Verify dashboard access after login
7. Test logout and protected route redirect

## Screenshots/Demo
- Home page with call-to-action
- Signup form with password strength meter
- Signin form with remember me
- Form validation errors (inline)
- Server error handling
- Success states and redirects

## Breaking Changes
- `App.tsx` now uses routing instead of direct component rendering
- Original forecast functionality moved to `/dashboard` route (requires auth)

## Future Enhancements
- Add password reset flow
- Add email verification
- Add social login (Google, GitHub)
- Add profile management page
- Add session management and refresh tokens
- Implement remember me with extended token expiry
