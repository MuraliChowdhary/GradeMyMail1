import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import ToneSelector from '../components/ToneSelector/ToneSelector';

const meta = {
  title: 'Components/ToneSelector',
  component: ToneSelector,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A clean, Apple-inspired dropdown component for selecting writing tone in Fix My Mail. Features smooth animations, keyboard navigation, and consistent styling with the Grade My Mail design system.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    selectedTone: {
      control: 'select',
      options: ['professional', 'friendly', 'persuasive', 'analytical', 'storytelling'],
      description: 'Currently selected tone',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the selector is disabled',
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes',
    },
  },
  args: {
    onToneChange: fn(),
  },
} satisfies Meta<typeof ToneSelector>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    selectedTone: 'friendly',
  },
};

export const Professional: Story = {
  args: {
    selectedTone: 'professional',
  },
};

export const Persuasive: Story = {
  args: {
    selectedTone: 'persuasive',
  },
};

export const Analytical: Story = {
  args: {
    selectedTone: 'analytical',
  },
};

export const Storytelling: Story = {
  args: {
    selectedTone: 'storytelling',
  },
};

export const Disabled: Story = {
  args: {
    selectedTone: 'friendly',
    disabled: true,
  },
};

export const CustomClassName: Story = {
  args: {
    selectedTone: 'friendly',
    className: 'custom-tone-selector',
  },
};

export const Interactive: Story = {
  args: {
    selectedTone: 'friendly',
  },
  parameters: {
    docs: {
      description: {
        story: 'Click the dropdown to see all available tone options. The component supports keyboard navigation with arrow keys and Escape to close.',
      },
    },
  },
};