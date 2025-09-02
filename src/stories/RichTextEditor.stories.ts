import type { Meta, StoryObj } from '@storybook/react';
import { RichTextEditor } from '../components/RichTextEditor/RichTextEditor';
import { mockHighlights } from '../test-utils/mocks';

const meta: Meta<typeof RichTextEditor> = {
  title: 'Components/RichTextEditor',
  component: RichTextEditor,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A rich text editor component with formatting capabilities and analysis integration.',
      },
    },
  },
  argTypes: {
    initialContent: {
      control: 'text',
      description: 'Initial content to display in the editor',
    },
    isAnalyzing: {
      control: 'boolean',
      description: 'Whether analysis is in progress',
    },
    error: {
      control: 'text',
      description: 'Error message to display',
    },
    highlights: {
      control: 'object',
      description: 'Highlights to display over the content',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    initialContent: 'Start typing your email content here...',
    onChange: () => {},
    onAnalyze: () => {},
  },
};

export const WithContent: Story = {
  args: {
    initialContent: 'This is a sample email with some content that can be analyzed for improvements.',
    onChange: () => {},
    onAnalyze: () => {},
  },
};

export const WithHighlights: Story = {
  args: {
    initialContent: 'This is a really great email that contains amazing deals and some complex sentences that are difficult to understand and process.',
    highlights: mockHighlights,
    onChange: () => {},
    onAnalyze: () => {},
  },
};

export const Loading: Story = {
  args: {
    initialContent: 'This content is being analyzed...',
    isAnalyzing: true,
    onChange: () => {},
    onAnalyze: () => {},
  },
};

export const WithError: Story = {
  args: {
    initialContent: 'This content failed to analyze.',
    error: 'Analysis service temporarily unavailable. Please try again.',
    onChange: () => {},
    onAnalyze: () => {},
  },
};

export const Empty: Story = {
  args: {
    initialContent: '',
    onChange: () => {},
    onAnalyze: () => {},
  },
};

export const LongContent: Story = {
  args: {
    initialContent: `This is a much longer email content that demonstrates how the editor handles extensive text. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.`,
    onChange: () => {},
    onAnalyze: () => {},
  },
};

export const DarkMode: Story = {
  args: {
    initialContent: 'This editor supports dark mode theming.',
    onChange: () => {},
    onAnalyze: () => {},
  },
  parameters: {
    backgrounds: { default: 'dark' },
  },
};