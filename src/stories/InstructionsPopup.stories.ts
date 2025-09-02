import type { Meta, StoryObj } from '@storybook/react';
import { InstructionsPopup } from '../components/InstructionsPopup';

const meta: Meta<typeof InstructionsPopup> = {
  title: 'Components/InstructionsPopup',
  component: InstructionsPopup,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'A dismissible instructions popup that appears on the right side of the screen to guide users through the newsletter grading process.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story: 'The default instructions popup with smooth animations and elegant styling.',
      },
    },
  },
  decorators: [
    (Story) => {
      // Clear localStorage to ensure popup shows
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('instructions-popup-dismissed');
      }
      return Story();
    },
  ],
};

export const AlreadyDismissed: Story = {
  parameters: {
    docs: {
      description: {
        story: 'When the popup has been dismissed, it will not appear again.',
      },
    },
  },
  decorators: [
    (Story) => {
      // Set localStorage to simulate dismissed state
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('instructions-popup-dismissed', 'true');
      }
      return Story();
    },
  ],
};