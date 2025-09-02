# Testing Documentation

This document outlines the comprehensive testing infrastructure for the Email Analysis System.

## Testing Stack

### Unit Testing
- **Framework**: Vitest (Vite-native test runner)
- **Testing Library**: React Testing Library
- **Mocking**: Vitest built-in mocks
- **Coverage**: V8 coverage provider

### Component Testing
- **Framework**: Cypress Component Testing
- **Environment**: Real browser environment
- **Providers**: React Query, Router mocks

### End-to-End Testing
- **Framework**: Cypress
- **Browser**: Chrome (headless in CI)
- **API Mocking**: Cypress intercepts

### Visual Regression Testing
- **Platform**: Chromatic
- **Integration**: Storybook stories
- **Automation**: GitHub Actions

## Test Structure

```
src/
├── components/
│   └── __tests__/           # Component unit tests
├── services/
│   └── __tests__/           # Service unit tests
├── utils/
│   └── __tests__/           # Utility unit tests
├── test-utils/
│   └── mocks.ts            # Shared test mocks
└── test-setup.ts           # Global test setup

cypress/
├── component/              # Component tests
├── e2e/                   # End-to-end tests
├── fixtures/              # Test data
└── support/               # Test utilities

.github/workflows/
├── test.yml               # Main test workflow
└── chromatic.yml          # Visual regression tests
```

## Running Tests

### Local Development

```bash
# Run all unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run component tests
npm run cypress:open

# Run E2E tests
npm run test:e2e

# Run all tests
npm run test:all
```

### Continuous Integration

Tests run automatically on:
- Push to main/develop branches
- Pull requests
- Scheduled nightly runs

## Test Categories

### 1. Unit Tests

**Location**: `src/**/__tests__/*.test.ts`

**Purpose**: Test individual functions and components in isolation

**Examples**:
- Analysis engine functions
- Utility functions
- Hook behavior
- Component logic

**Coverage Requirements**:
- Branches: 70%
- Functions: 70%
- Lines: 70%
- Statements: 70%

### 2. Component Tests

**Location**: `cypress/component/*.cy.tsx`

**Purpose**: Test React components in a real browser environment

**Features**:
- Real DOM interactions
- Provider integration
- Event handling
- Accessibility testing

### 3. End-to-End Tests

**Location**: `cypress/e2e/*.cy.ts`

**Purpose**: Test complete user workflows

**Scenarios**:
- Email analysis workflow
- Content improvement process
- Error handling
- Navigation flows

### 4. Visual Regression Tests

**Platform**: Chromatic + Storybook

**Purpose**: Detect visual changes in UI components

**Coverage**:
- All component states
- Theme variations
- Responsive layouts
- Loading states

## Mock Data

### AI API Responses

```typescript
// cypress/fixtures/ai-responses.json
{
  "analyze": {
    "success": { /* tagged content */ },
    "noIssues": { /* clean content */ },
    "error": { /* error response */ }
  },
  "fix": {
    "success": { /* improvements */ },
    "error": { /* error response */ }
  }
}
```

### Test Email Content

```typescript
// cypress/fixtures/test-emails.json
{
  "businessEmail": { /* professional content */ },
  "marketingEmail": { /* promotional content */ },
  "poorEmail": { /* problematic content */ },
  "wellWrittenEmail": { /* clean content */ }
}
```

## Custom Commands

### Cypress Commands

```typescript
// Select by data-cy attribute
cy.dataCy('element-name')

// Mock AI API responses
cy.mockAIResponse('analyze', response)

// Wait for analysis completion
cy.waitForAnalysis()

// Type in rich text editor
cy.typeInEditor('content')
```

### Test Utilities

```typescript
// Setup test environment
setupTestEnvironment()

// Create mock query client
createMockQueryClient()

// Mock fetch responses
mockFetch('/api/analyze', true)
```

## Error Handling Tests

### Network Errors
- API timeouts
- Connection failures
- Invalid responses

### Application Errors
- Component crashes
- State corruption
- Memory leaks

### User Errors
- Invalid input
- Missing data
- Navigation errors

## Performance Testing

### Metrics Tracked
- Component render times
- API response times
- Memory usage
- Bundle size

### Thresholds
- Analysis: < 2 seconds
- Highlighting: < 100ms
- Diff rendering: < 500ms

## Accessibility Testing

### Automated Checks
- ARIA labels
- Keyboard navigation
- Color contrast
- Screen reader support

### Manual Testing
- Tab order
- Focus management
- Voice navigation
- High contrast mode

## Best Practices

### Writing Tests

1. **Arrange, Act, Assert** pattern
2. **Descriptive test names**
3. **Single responsibility** per test
4. **Mock external dependencies**
5. **Test user behavior**, not implementation

### Test Data

1. **Use realistic data**
2. **Cover edge cases**
3. **Maintain test fixtures**
4. **Avoid hardcoded values**

### Maintenance

1. **Update tests with features**
2. **Remove obsolete tests**
3. **Monitor test performance**
4. **Review test coverage**

## Debugging Tests

### Unit Tests
```bash
# Debug specific test
npm run test -- --reporter=verbose specific.test.ts

# Debug with browser
npm run test:ui
```

### Cypress Tests
```bash
# Open Cypress UI
npm run cypress:open

# Run with debug output
DEBUG=cypress:* npm run cypress:run
```

### Coverage Analysis
```bash
# Generate detailed coverage
npm run test:coverage

# View coverage report
open coverage/index.html
```

## CI/CD Integration

### GitHub Actions

**Triggers**:
- Push to main/develop
- Pull requests
- Manual dispatch

**Jobs**:
- Unit tests
- Component tests
- E2E tests
- Visual regression
- Build verification

**Artifacts**:
- Test results
- Coverage reports
- Screenshots/videos
- Build outputs

### Quality Gates

**Required Checks**:
- All tests pass
- Coverage thresholds met
- No linting errors
- Build succeeds

**Optional Checks**:
- Visual changes approved
- Performance benchmarks
- Security scans

## Monitoring

### Test Metrics
- Pass/fail rates
- Execution times
- Flaky test detection
- Coverage trends

### Alerts
- Test failures
- Coverage drops
- Performance regressions
- Visual changes

## Troubleshooting

### Common Issues

1. **Flaky tests**: Add proper waits and assertions
2. **Memory leaks**: Clean up in afterEach hooks
3. **Timeout errors**: Increase timeout values
4. **Mock issues**: Verify mock setup and cleanup

### Debug Commands

```bash
# Clear test cache
npm run test -- --clearCache

# Run single test file
npm run test -- path/to/test.ts

# Verbose output
npm run test -- --verbose

# Watch mode with coverage
npm run test:watch --coverage
```