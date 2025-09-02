# Email Analysis System

A modern React application built with industry-standard tooling for analyzing and grading email content.

## 🚀 Tech Stack

- **React 19** - Latest React with modern features
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework with custom design tokens
- **ESLint** - Code linting with TypeScript support
- **Prettier** - Code formatting
- **Husky** - Git hooks for code quality
- **lint-staged** - Run linters on staged files

## 🛠️ Development Setup

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Code Quality

```bash
# Run linter
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check
```

## 📁 Project Structure

```
src/
├── components/     # Reusable UI components
├── pages/         # Page components
├── hooks/         # Custom React hooks
├── services/      # API and external service integrations
├── types/         # TypeScript type definitions
├── utils/         # Utility functions
└── assets/        # Static assets
```

## 🎨 Design System

The project includes a comprehensive design system built with Tailwind CSS:

- **Colors**: Primary, secondary, success, warning, and error color palettes
- **Typography**: Inter font family with JetBrains Mono for code
- **Components**: Pre-built component classes (buttons, cards, inputs)
- **Spacing**: Extended spacing scale
- **Shadows**: Soft, medium, and hard shadow utilities

### Custom CSS Classes

- `.btn-primary` - Primary button styling
- `.btn-secondary` - Secondary button styling
- `.card` - Card container with shadow and border
- `.input-field` - Styled form input

## 🔧 Path Aliases

The project is configured with path aliases for cleaner imports:

- `@/*` - src directory
- `@components/*` - src/components
- `@pages/*` - src/pages
- `@hooks/*` - src/hooks
- `@utils/*` - src/utils
- `@types/*` - src/types
- `@services/*` - src/services
- `@assets/*` - src/assets

## 🔍 Code Quality

- **Pre-commit hooks** automatically run linting and formatting
- **TypeScript strict mode** enabled for type safety
- **ESLint** configured with React and TypeScript rules
- **Prettier** for consistent code formatting

## 📦 Build Output

The production build is optimized with:

- Tree shaking for smaller bundle sizes
- CSS purging to remove unused styles
- Asset optimization and compression
- Modern JavaScript output for better performance
