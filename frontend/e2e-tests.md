# E2E Test Plan for Authentication Pages

This document outlines the End-to-End (E2E) test scenarios for the Signup and Signin pages. These tests can be implemented using **Cypress**, **Playwright**, or **Puppeteer**.

## Prerequisites

### Installation (Cypress example)
```bash
npm install --save-dev cypress
npx cypress open
```

### Installation (Playwright example)
```bash
npm install --save-dev @playwright/test
npx playwright install
```

## Test Scenarios

### 1. Signup Flow - Success Path

**Test Name:** `successful-signup`

**Steps:**
1. Visit `/signup`
2. Fill in the form:
   - Name: "John Doe"
   - Email: "john.doe@example.com"
   - Password: "SecurePass123"
   - Confirm Password: "SecurePass123"
   - Phone: "1234567890" (optional)
3. Mock successful API response:
   ```json
   {
     "user": { "id": "1", "name": "John Doe", "email": "john.doe@example.com" },
     "token": "mock-jwt-token"
   }
   ```
4. Click "Create Account" button
5. Assert success message is displayed
6. Assert redirect to `/dashboard` occurs
7. Assert token is stored in localStorage

**Expected Result:** User is redirected to dashboard and can see their account.

---

### 2. Signup Flow - Validation Errors

**Test Name:** `signup-validation-errors`

**Steps:**
1. Visit `/signup`
2. Try to submit the form without filling any fields
3. Assert inline error messages appear for:
   - "Full name is required"
   - "Email is required"
   - "Password is required"
   - "Please confirm your password"
4. Fill email with invalid format (e.g., "notanemail")
5. Blur from email input
6. Assert error: "Please enter a valid email address"
7. Fill password with less than 8 characters (e.g., "pass1")
8. Blur from password input
9. Assert error: "Password must be at least 8 characters"
10. Fill password correctly but different confirm password
11. Assert error: "Passwords do not match"

**Expected Result:** Appropriate validation errors are shown inline.

---

### 3. Signup Flow - Server Error Handling

**Test Name:** `signup-server-error`

**Steps:**
1. Visit `/signup`
2. Fill in valid form data
3. Mock API error response (400):
   ```json
   {
     "message": "Email already exists",
     "errors": { "email": "This email is already registered" }
   }
   ```
4. Click "Create Account"
5. Assert error banner is displayed with message
6. Assert field-level error appears on email input
7. Assert user remains on signup page

**Expected Result:** User sees clear error messages and can retry.

---

### 4. Signup Flow - Network Failure

**Test Name:** `signup-network-failure`

**Steps:**
1. Visit `/signup`
2. Fill in valid form data
3. Mock network failure (simulate offline/timeout)
4. Click "Create Account"
5. Assert error banner: "Unable to connect to the server. Please check your connection and try again."
6. Assert submit button is re-enabled for retry

**Expected Result:** User can retry after network failure.

---

### 5. Signin Flow - Success Path

**Test Name:** `successful-signin`

**Steps:**
1. Visit `/signin`
2. Fill in the form:
   - Email: "john.doe@example.com"
   - Password: "SecurePass123"
3. Check "Remember me" checkbox
4. Mock successful API response:
   ```json
   {
     "user": { "id": "1", "name": "John Doe", "email": "john.doe@example.com" },
     "token": "mock-jwt-token"
   }
   ```
5. Click "Sign In" button
6. Assert success message is displayed
7. Assert redirect to `/dashboard`
8. Assert token is stored in localStorage

**Expected Result:** User is logged in and redirected to dashboard.

---

### 6. Signin Flow - Invalid Credentials

**Test Name:** `signin-invalid-credentials`

**Steps:**
1. Visit `/signin`
2. Fill in the form:
   - Email: "wrong@example.com"
   - Password: "wrongpassword"
3. Mock API error response (401):
   ```json
   {
     "message": "Invalid credentials"
   }
   ```
4. Click "Sign In"
5. Assert error banner displays: "Invalid credentials"
6. Assert user remains on signin page
7. Assert form fields are still filled (not cleared)

**Expected Result:** Clear error message without clearing form.

---

### 7. Password Visibility Toggle

**Test Name:** `password-show-hide-toggle`

**Steps:**
1. Visit `/signup`
2. Type password in the password field
3. Assert password input type is "password" (masked)
4. Click the eye icon (show password button)
5. Assert password input type changes to "text" (visible)
6. Assert password value is visible as plain text
7. Click the eye-off icon (hide password button)
8. Assert password input type changes back to "password"

**Expected Result:** Password visibility toggles correctly.

---

### 8. Password Strength Meter

**Test Name:** `password-strength-indicator`

**Steps:**
1. Visit `/signup`
2. Type "pass" in password field
3. Assert strength meter shows "weak" with red color
4. Type "password123" (medium complexity)
5. Assert strength meter shows "medium" with yellow color
6. Type "MyP@ssw0rd!2024" (high complexity)
7. Assert strength meter shows "strong" with green color

**Expected Result:** Strength meter updates dynamically based on password complexity.

---

### 9. Protected Route Redirect

**Test Name:** `protected-route-redirect`

**Steps:**
1. Ensure no token is stored in localStorage
2. Try to visit `/dashboard` directly
3. Assert redirect to `/signin` occurs
4. Assert message or URL indicates authentication required

**Expected Result:** Unauthenticated users cannot access dashboard.

---

### 10. Logout Functionality

**Test Name:** `logout-flow`

**Steps:**
1. Login successfully (use steps from test #5)
2. Assert user is on `/dashboard`
3. Click "Logout" button
4. Assert token is removed from localStorage
5. Assert redirect to `/signin` occurs
6. Try to visit `/dashboard` again
7. Assert redirect to `/signin` happens

**Expected Result:** User is logged out and cannot access protected routes.

---

## Running E2E Tests

### Using Cypress

Create `cypress/e2e/auth.cy.ts` and add test implementations.

**Run tests:**
```bash
npx cypress open    # Interactive mode
npx cypress run     # Headless mode
```

### Using Playwright

Create `tests/auth.spec.ts` and add test implementations.

**Run tests:**
```bash
npx playwright test           # Run all tests
npx playwright test --headed  # With browser UI
npx playwright test --debug   # Debug mode
```

## Mocking API Responses

### Cypress Example
```typescript
cy.intercept('POST', '**/api/auth/signup', {
  statusCode: 201,
  body: {
    user: { id: '1', name: 'John Doe', email: 'john@example.com' },
    token: 'mock-token'
  }
}).as('signupRequest');
```

### Playwright Example
```typescript
await page.route('**/api/auth/signup', route => {
  route.fulfill({
    status: 201,
    body: JSON.stringify({
      user: { id: '1', name: 'John Doe', email: 'john@example.com' },
      token: 'mock-token'
    })
  });
});
```

## Test Coverage Goals

- ✅ Form validation (client-side)
- ✅ API integration (mocked)
- ✅ Success flows
- ✅ Error handling (server errors, network failures)
- ✅ UI interactions (toggles, checkboxes)
- ✅ Navigation and redirects
- ✅ Authentication state management

## Notes

- Mock the backend API to avoid hitting the real server during tests
- Tests should be idempotent and can run in any order
- Clean up localStorage/sessionStorage between tests
- Use test-specific data that won't conflict with production data
