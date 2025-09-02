import type { Meta, StoryObj } from '@storybook/react';
import { HighlightOverlay } from '../components/HighlightOverlay/HighlightOverlay';
import { mockHighlights } from '../test-utils/mocks';

const meta: Meta<typeof HighlightOverlay> = {
  title: 'Components/HighlightOverlay',
  component: HighlightOverlay,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'An overlay component that displays highlights over text content.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ position: 'relative', width: '600px', height: '400px', border: '1px solid #ccc', padding: '20px' }}>
        <p>This is sample text content that would have highlights overlaid on top of it. The highlights would appear as colored overlays indicating different types of issues found in the text.</p>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    highlights: {
      control: 'object',
      description: 'Array of highlight objects to display',
    },
    isVisible: {
      control: 'boolean',
      description: 'Whether the overlay is visible',
    },
    animateIn: {
      control: 'boolean',
      description: 'Whether to animate highlights when they appear',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    highlights: mockHighlights,
    containerRef: { current: null },
    isVisible: true,
  },
};

export const Empty: Story = {
  args: {
    highlights: [],
    containerRef: { current: null },
    isVisible: true,
  },
};

export const Hidden: Story = {
  args: {
    highlights: mockHighlights,
    containerRef: { current: null },
    isVisible: false,
  },
};

export const WithAnimation: Story = {
  args: {
    highlights: mockHighlights,
    containerRef: { current: null },
    isVisible: true,
    animateIn: true,
  },
};

export const SingleHighlight: Story = {
  args: {
    highlights: [mockHighlights[0]],
    containerRef: { current: null },
    isVisible: true,
  },
};

export const FluffOnly: Story = {
  args: {
    highlights: mockHighlights.filter(h => h.type === 'fluff'),
    containerRef: { current: null },
    isVisible: true,
  },
};

export const SpamWordsOnly: Story = {
  args: {
    highlights: mockHighlights.filter(h => h.type === 'spam_words'),
    containerRef: { current: null },
    isVisible: true,
  },
};

export const HardToReadOnly: Story = {
  args: {
    highlights: mockHighlights.filter(h => h.type === 'hard_to_read'),
    containerRef: { current: null },
    isVisible: true,
  },
};

export const ManyHighlights: Story = {
  args: {
    highlights: [
      ...mockHighlights,
      ...mockHighlights.map((h, i) => ({ ...h, id: `${h.id}-${i}`, position: { start: h.position.start + 100, end: h.position.end + 100 } })),
      ...mockHighlights.map((h, i) => ({ ...h, id: `${h.id}-${i}-2`, position: { start: h.position.start + 200, end: h.position.end + 200 } })),
    ],
    containerRef: { current: null },
    isVisible: true,
  },
};