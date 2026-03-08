# E-Commerce Platform - E2E Tests

Comprehensive Playwright end-to-end tests for the construction e-commerce platform.

## Overview

This test suite covers all major user flows and functionalities:

### Test Coverage

1. **Authentication (tests/auth/)**
   - Customer registration and login
   - Merchant registration and login
   - Admin 2FA login
   - OTP verification
   - Session management

2. **Customer Flows (tests/customer/)**
   - Product browsing and search
   - Product detail viewing
   - Shopping cart operations
   - Checkout process
   - Order placement
   - Order history

3. **Admin Flows (tests/admin/)**
   - Dashboard overview
   - User management
   - Merchant approval/management
   - Product catalog management
   - Order management and assignment
   - Platform settings

4. **Merchant Flows (tests/merchant/)**
   - Dashboard metrics
   - Inventory management
   - Product pricing and stock
   - Order fulfillment
   - Status updates

## Prerequisites

1. **Backend Server**: The application backend must be running on `http://localhost:5000`
2. **Frontend Server**: The React frontend must be running on `http://localhost:3000`
3. **Database**: MongoDB must be running with seeded data

## Installation

Navigate to the e2e-tests directory:

```bash
cd /home/oem/projects/ecomm/e2e-tests
npm install
```

Note: Playwright and browser binaries are already installed.

## Starting the Application

Before running tests, start both backend and frontend:

```bash
# From the main ecomm directory
cd /home/oem/projects/ecomm

# Start both servers (from root directory)
npm run dev
```

This will start:
- Backend on `http://localhost:5000`
- Frontend on `http://localhost:3000`

Wait for both servers to be fully running before executing tests.

## Running Tests

### Run All Tests (Headed Mode - You'll see the browser)

```bash
npm run test:headed
```

### Run All Tests (Headless Mode - Background)

```bash
npm test
```

### Run Specific Test Suites

**Authentication Tests:**
```bash
npm run test:auth
```

**Customer Tests:**
```bash
npm run test:customer
```

**Merchant Tests:**
```bash
npm run test:merchant
```

**Admin Tests:**
```bash
npm run test:admin
```

### Run Tests in UI Mode (Interactive)

```bash
npm run test:ui
```

This opens Playwright's interactive UI where you can:
- Select specific tests to run
- Watch tests execute
- Time travel through test steps
- Inspect DOM and screenshots

### Debug Mode

```bash
npm run test:debug
```

Opens Playwright Inspector for step-by-step debugging.

### View Test Report

After tests run:

```bash
npm run report
```

## Test Configuration

The tests are configured with:

- **Timeout**: 60 seconds per test
- **Slow Motion**: 500ms delay between actions (for visibility)
- **Screenshots**: Captured on failure
- **Videos**: Recorded on failure
- **Trace**: Enabled on first retry
- **Serial Execution**: Tests in the same file run sequentially (not parallel)
- **Single Login**: Each test suite logs in once and reuses the session for all tests

Modify `playwright.config.js` to adjust these settings.

### Why Serial Execution?

Tests use `test.describe.serial()` which means:
- Tests run one after another (not in parallel)
- Login happens only once per test file
- Session is reused across all tests in the same file
- Faster execution and easier to watch

This is especially important for admin, merchant, and customer flows where logging in repeatedly would be slow and unnecessary.

## Test Data

Test data is located in `utils/test-data.js`:

- **Demo OTP**: `1234` (hardcoded in backend for testing)
- **Test Customer**: Phone `9876543210`
- **Test Merchant**: Phone `9876543211`
- **Test Admin**:
  - Phone: `9999999999`
  - Email: `admin@test.com`
  - Password: `Admin@123`

## Page Object Model

The tests use the Page Object Model pattern:

```
pages/
├── BasePage.js           # Base class with common methods
├── LoginPage.js          # Login functionality
├── RegisterPage.js       # Registration flows
├── ProductsPage.js       # Product browsing
├── ProductDetailPage.js  # Product details
├── CartPage.js           # Shopping cart
├── CheckoutPage.js       # Checkout process
├── ProfilePage.js        # User profile & orders
├── AdminDashboardPage.js # Admin pages
└── MerchantDashboardPage.js # Merchant pages
```

## Test Structure

```
tests/
├── auth/                 # Authentication tests
│   ├── customer-auth.spec.js
│   ├── merchant-auth.spec.js
│   └── admin-auth.spec.js
├── customer/             # Customer flow tests
│   ├── product-browsing.spec.js
│   ├── shopping-cart.spec.js
│   └── checkout-flow.spec.js
├── admin/               # Admin tests
│   ├── admin-dashboard.spec.js
│   ├── merchant-management.spec.js
│   ├── product-management.spec.js
│   └── order-management.spec.js
└── merchant/            # Merchant tests
    ├── merchant-dashboard.spec.js
    ├── inventory-management.spec.js
    └── order-fulfillment.spec.js
```

## Writing New Tests

1. Create a new spec file in the appropriate directory
2. Import required page objects and test data
3. Use descriptive test names
4. Follow the existing patterns

Example:

```javascript
const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../../pages/LoginPage');
const { CUSTOMER_DATA, TEST_OTP } = require('../../utils/test-data');

test.describe('My Feature Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should do something', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.loginAsCustomer(CUSTOMER_DATA.phone, TEST_OTP);

    // Your test assertions
    expect(page.url()).toContain('/expected-path');
  });
});
```

## Troubleshooting

### Tests Failing?

1. **Check servers are running**: Both backend and frontend must be up
2. **Check database**: Ensure MongoDB is running and seeded
3. **Check test data**: Admin user should exist in database
4. **Clear browser data**: Old sessions might interfere
5. **Check network**: Ensure localhost ports 3000 and 5000 are accessible

### Slow Tests?

- Reduce `slowMo` in `playwright.config.js`
- Run in headless mode instead of headed
- Increase timeouts if needed

### Flaky Tests?

- Add explicit waits where needed
- Check for race conditions
- Ensure proper cleanup between tests

## Best Practices

1. **Keep tests independent**: Each test should work standalone
2. **Use Page Objects**: Don't write selectors in test files
3. **Add meaningful assertions**: Verify expected behavior
4. **Clean up test data**: Remove or reset data after tests
5. **Use descriptive names**: Test names should explain what they verify

## Continuous Integration

To run tests in CI:

```bash
# Headless mode with retries
npm test
```

Set environment variable for CI detection:
```bash
CI=true npm test
```

## Reports and Artifacts

After test execution, find:

- **HTML Report**: `playwright-report/index.html`
- **Test Results**: `test-results/`
- **Screenshots**: Captured on failure
- **Videos**: Recorded on failure
- **Traces**: Available for debugging

## Support

For issues or questions:
1. Check the Playwright documentation: https://playwright.dev
2. Review test logs and screenshots
3. Run tests in debug mode for investigation

## Folder Structure

```
e2e-tests/
├── tests/               # Test specifications
├── pages/               # Page Object Models
├── utils/               # Helpers and test data
├── fixtures/            # Test fixtures
├── playwright.config.js # Playwright configuration
├── package.json         # Dependencies
└── README.md           # This file
```

---

Happy Testing!
