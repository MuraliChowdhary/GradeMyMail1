import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, expect } from '@storybook/test';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';

// Import components for visual regression testing
import { RichTextEditor } from '../components/RichTextEditor/RichTextEditor';
import { HighlightOverlay } from '../components/HighlightOverlay/HighlightOverlay';
import { VirtualizedDiffViewer } from '../components/VirtualizedDiff/VirtualizedDiffViewer';
import { LoadingScreen } from '../components/LoadingScreen/LoadingScreen';
import { ErrorDisplay } from '../components/ErrorDisplay/ErrorDisplay';

// Mock data for visual tests
const mockHighlights = [
  {
    id: '1',
    type: 'fluff' as const,
    text: 'really great',
    position: { start: 10, end: 22 },
    severity: 'medium' as const,
  },
  {
    id: '2',
    type: 'spam_words' as const,
    text: 'amazing deals',
    position: { start: 45, end: 58 },
    severity: 'high' as const,
  },
  {
    id: '3',
    type: 'hard_to_read' as const,
    text: 'complex sentence',
    position: { start: 70, end: 86 },
    severity: 'low' as const,
  },
];

const mockDiffData = [
  {
    type: 'unchanged' as const,
    content: 'This is a',
    lineNumber: 1,
  },
  {
    type: 'removed' as const,
    content: 'really great',
    lineNumber: 2,
  },
  {
    type: 'added' as const,
    content: 'excellent',
    lineNumber: 2,
  },
  {
    type: 'unchanged' as const,
    content: 'email that contains',
    lineNumber: 3,
  },
  {
    type: 'removed' as const,
    content: 'amazing deals',
    lineNumber: 4,
  },
  {
    type: 'added' as const,
    content: 'valuable offers',
    lineNumber: 4,
  },
];

// Wrapper component with providers
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen bg-white">
          {children}
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

const meta: Meta = {
  title: 'Visual Regression Tests',
  parameters: {
    layout: 'fullscreen',
    chromatic: {
      viewports: [320, 768, 1024, 1440],
      delay: 1000,
      pauseAnimationAtEnd: true,
    },
  },
  decorators: [
    (Story) => (
      <TestWrapper>
        <Story />
      </TestWrapper>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof meta>;

// Rich Text Editor Visual Tests
export const RichTextEditorEmpty: Story = {
  render: () => React.createElement(RichTextEditor, {
    content: '',
    onChange: () => {},
    placeholder: 'Type your email content here...',
  }),
  parameters: {
    chromatic: { delay: 500 },
  },
};

export const RichTextEditorWithContent: Story = {
  render: () => React.createElement(RichTextEditor, {
    content: '<p>This is a <strong>sample email</strong> with <em>formatting</em> and a <a href="#">link</a>.</p>',
    onChange: () => {},
    placeholder: 'Type your email content here...',
  }),
  parameters: {
    chromatic: { delay: 500 },
  },
};

export const RichTextEditorFocused: Story = {
  render: () => React.createElement(RichTextEditor, {
    content: 'This is focused content',
    onChange: () => {},
    placeholder: 'Type your email content here...',
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const editor = canvas.getByRole('textbox');
    await userEvent.click(editor);
  },
  parameters: {
    chromatic: { delay: 1000 },
  },
};

// Highlight Overlay Visual Tests
export const HighlightOverlayMultipleTypes: Story = {
  render: () => React.createElement('div', {
    className: 'relative p-8',
    children: [
      React.createElement('div', {
        key: 'content',
        className: 'text-lg leading-relaxed',
        children: 'This is a really great email that contains amazing deals and some complex sentences.',
      }),
      React.createElement(HighlightOverlay, {
        key: 'overlay',
        highlights: mockHighlights,
        containerRef: { current: null },
      }),
    ],
  }),
  parameters: {
    chromatic: { delay: 1500 },
  },
};

export const HighlightOverlayFluffOnly: Story = {
  render: () => React.createElement('div', {
    className: 'relative p-8',
    children: [
      React.createElement('div', {
        key: 'content',
        className: 'text-lg leading-relaxed',
        children: 'I hope this email finds you well and I wanted to reach out.',
      }),
      React.createElement(HighlightOverlay, {
        key: 'overlay',
        highlights: [mockHighlights[0]],
        containerRef: { current: null },
      }),
    ],
  }),
  parameters: {
    chromatic: { delay: 1000 },
  },
};

export const HighlightOverlaySpamWordsOnly: Story = {
  render: () => React.createElement('div', {
    className: 'relative p-8',
    children: [
      React.createElement('div', {
        key: 'content',
        className: 'text-lg leading-relaxed',
        children: 'Check out our AMAZING DEALS and LIMITED TIME OFFERS!',
      }),
      React.createElement(HighlightOverlay, {
        key: 'overlay',
        highlights: [mockHighlights[1]],
        containerRef: { current: null },
      }),
    ],
  }),
  parameters: {
    chromatic: { delay: 1000 },
  },
};

// Diff Viewer Visual Tests
export const DiffViewerSideBySide: Story = {
  render: () => React.createElement(VirtualizedDiffViewer, {
    originalText: 'This is a really great email that contains amazing deals.',
    improvedText: 'This is an excellent email that contains valuable offers.',
    diffData: mockDiffData,
    onHover: () => {},
  }),
  parameters: {
    chromatic: { delay: 1000 },
  },
};

export const DiffViewerLongContent: Story = {
  render: () => React.createElement(VirtualizedDiffViewer, {
    originalText: 'This is a really great email that contains amazing deals and some complex sentences that are difficult to understand and process. '.repeat(10),
    improvedText: 'This is an excellent email that contains valuable offers and clear, concise information. '.repeat(10),
    diffData: Array.from({ length: 20 }, (_, i) => ({
      type: i % 3 === 0 ? 'unchanged' as const : i % 3 === 1 ? 'removed' as const : 'added' as const,
      content: `Line ${i + 1} content`,
      lineNumber: i + 1,
    })),
    onHover: () => {},
  }),
  parameters: {
    chromatic: { delay: 1500 },
  },
};

// Loading States Visual Tests
export const LoadingScreenAnalysis: Story = {
  render: () => React.createElement(LoadingScreen, {
    message: 'Analyzing your email content...',
    progress: 45,
    tip: 'Use active voice to make your emails more engaging.',
  }),
  parameters: {
    chromatic: { delay: 500 },
  },
};

export const LoadingScreenImprovement: Story = {
  render: () => React.createElement(LoadingScreen, {
    message: 'Generating improvements...',
    progress: 75,
    tip: 'Keep sentences under 20 words for better readability.',
  }),
  parameters: {
    chromatic: { delay: 500 },
  },
};

// Error States Visual Tests
export const ErrorDisplayNetwork: Story = {
  render: () => React.createElement(ErrorDisplay, {
    error: {
      type: 'network',
      message: 'Network connection failed. Please check your internet connection and try again.',
      code: 'NETWORK_ERROR',
    },
    onRetry: () => {},
    onDismiss: () => {},
  }),
  parameters: {
    chromatic: { delay: 500 },
  },
};

export const ErrorDisplayServer: Story = {
  render: () => React.createElement(ErrorDisplay, {
    error: {
      type: 'server',
      message: 'Analysis service temporarily unavailable. Please try again in a few moments.',
      code: 'SERVICE_UNAVAILABLE',
    },
    onRetry: () => {},
    onDismiss: () => {},
  }),
  parameters: {
    chromatic: { delay: 500 },
  },
};

export const ErrorDisplayValidation: Story = {
  render: () => React.createElement(ErrorDisplay, {
    error: {
      type: 'validation',
      message: 'Please enter some email content to analyze.',
      code: 'EMPTY_CONTENT',
    },
    onRetry: () => {},
    onDismiss: () => {},
  }),
  parameters: {
    chromatic: { delay: 500 },
  },
};

// Dark Mode Visual Tests
export const DarkModeRichTextEditor: Story = {
  render: () => React.createElement(RichTextEditor, {
    content: '<p>This is content in <strong>dark mode</strong>.</p>',
    onChange: () => {},
    placeholder: 'Type your email content here...',
  }),
  parameters: {
    backgrounds: { default: 'dark' },
    chromatic: { delay: 500 },
  },
  decorators: [
    (Story) => (
      <div className="dark">
        <TestWrapper>
          <div className="min-h-screen bg-gray-900 text-white">
            <Story />
          </div>
        </TestWrapper>
      </div>
    ),
  ],
};

export const DarkModeHighlights: Story = {
  render: () => React.createElement('div', {
    className: 'relative p-8',
    children: [
      React.createElement('div', {
        key: 'content',
        className: 'text-lg leading-relaxed text-white',
        children: 'This is a really great email that contains amazing deals.',
      }),
      React.createElement(HighlightOverlay, {
        key: 'overlay',
        highlights: mockHighlights,
        containerRef: { current: null },
      }),
    ],
  }),
  parameters: {
    backgrounds: { default: 'dark' },
    chromatic: { delay: 1500 },
  },
  decorators: [
    (Story) => (
      <div className="dark">
        <TestWrapper>
          <div className="min-h-screen bg-gray-900">
            <Story />
          </div>
        </TestWrapper>
      </div>
    ),
  ],
};

// Mobile Responsive Visual Tests
export const MobileRichTextEditor: Story = {
  render: () => React.createElement(RichTextEditor, {
    content: '<p>This is mobile content with <strong>formatting</strong>.</p>',
    onChange: () => {},
    placeholder: 'Type your email content here...',
  }),
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    chromatic: { 
      viewports: [320],
      delay: 500,
    },
  },
};

export const MobileDiffViewer: Story = {
  render: () => React.createElement(VirtualizedDiffViewer, {
    originalText: 'This is a really great email.',
    improvedText: 'This is an excellent email.',
    diffData: mockDiffData.slice(0, 6),
    onHover: () => {},
  }),
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    chromatic: { 
      viewports: [320],
      delay: 1000,
    },
  },
};

// Interaction States Visual Tests
export const HoverStatesDemo: Story = {
  render: () => React.createElement('div', {
    className: 'p-8 space-y-4',
    children: [
      React.createElement('button', {
        key: 'primary',
        className: 'px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors',
        children: 'Primary Button',
      }),
      React.createElement('button', {
        key: 'secondary',
        className: 'px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors',
        children: 'Secondary Button',
      }),
      React.createElement('div', {
        key: 'highlight',
        className: 'p-4 border rounded hover:shadow-lg transition-shadow cursor-pointer',
        children: 'Hoverable Card',
      }),
    ],
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const primaryButton = canvas.getByText('Primary Button');
    await userEvent.hover(primaryButton);
  },
  parameters: {
    chromatic: { delay: 1000 },
  },
};

// Focus States Visual Tests
export const FocusStatesDemo: Story = {
  render: () => React.createElement('div', {
    className: 'p-8 space-y-4',
    children: [
      React.createElement('input', {
        key: 'input',
        type: 'text',
        placeholder: 'Focused input',
        className: 'w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
      }),
      React.createElement('textarea', {
        key: 'textarea',
        placeholder: 'Focused textarea',
        className: 'w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
        rows: 3,
      }),
      React.createElement('button', {
        key: 'button',
        className: 'px-4 py-2 bg-blue-600 text-white rounded focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        children: 'Focused Button',
      }),
    ],
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByPlaceholderText('Focused input');
    await userEvent.click(input);
  },
  parameters: {
    chromatic: { delay: 1000 },
  },
};