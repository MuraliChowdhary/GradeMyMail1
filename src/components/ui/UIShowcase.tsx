import React, { useState } from 'react';
import Button from './Button';
import Input from './Input';
import Card from './Card';
import Stack from './Stack';
import Badge from './Badge';
import LoadingSpinner from './LoadingSpinner';

const UIShowcase: React.FC = () => {
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLoadingDemo = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <div className="container-narrow" style={{ padding: 'var(--space-8)' }}>
      <Stack spacing="xl">
        <div className="text-title">Premium Minimal UI Components</div>
        
        {/* Button Showcase */}
        <Card variant="spacious">
          <Stack spacing="lg">
            <div className="text-heading">Buttons</div>
            <Stack direction="horizontal" spacing="md" align="center">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="primary" loading={loading}>
                {loading ? 'Loading...' : 'Load Demo'}
              </Button>
            </Stack>
            <Stack direction="horizontal" spacing="md" align="center">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
            </Stack>
            <Button fullWidth onClick={handleLoadingDemo}>
              Full Width Button
            </Button>
          </Stack>
        </Card>

        {/* Input Showcase */}
        <Card variant="spacious">
          <Stack spacing="lg">
            <div className="text-heading">Inputs</div>
            <Input 
              label="Default Input"
              placeholder="Enter some text..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
            <Input 
              variant="minimal"
              placeholder="Minimal input style"
            />
            <Input 
              variant="ghost"
              placeholder="Ghost input style"
            />
            <Input 
              error="This field is required"
              placeholder="Input with error"
            />
            <Input 
              icon={<span>🔍</span>}
              placeholder="Input with icon"
            />
          </Stack>
        </Card>

        {/* Card Showcase */}
        <Stack spacing="md">
          <div className="text-heading">Cards</div>
          <Stack direction="horizontal" spacing="md" align="stretch">
            <Card variant="default">
              <div className="text-subheading">Default Card</div>
              <div className="text-body">Standard card with border and shadow</div>
            </Card>
            <Card variant="minimal">
              <div className="text-subheading">Minimal Card</div>
              <div className="text-body">Clean card without border</div>
            </Card>
            <Card variant="elevated">
              <div className="text-subheading">Elevated Card</div>
              <div className="text-body">Card with enhanced shadow</div>
            </Card>
          </Stack>
        </Stack>

        {/* Badge Showcase */}
        <Card variant="spacious">
          <Stack spacing="lg">
            <div className="text-heading">Badges</div>
            <Stack direction="horizontal" spacing="md" align="center">
              <Badge variant="default">Default</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="error">Error</Badge>
              <Badge variant="info">Info</Badge>
            </Stack>
            <Stack direction="horizontal" spacing="md" align="center">
              <Badge size="sm">Small</Badge>
              <Badge size="md">Medium</Badge>
            </Stack>
          </Stack>
        </Card>

        {/* Loading Showcase */}
        <Card variant="spacious">
          <Stack spacing="lg">
            <div className="text-heading">Loading Indicators</div>
            <Stack direction="horizontal" spacing="md" align="center">
              <LoadingSpinner size="sm" />
              <LoadingSpinner size="md" />
              <LoadingSpinner size="lg" />
            </Stack>
            <Stack direction="horizontal" spacing="md" align="center">
              <LoadingSpinner variant="dots" size="sm" />
              <LoadingSpinner variant="dots" size="md" />
              <LoadingSpinner variant="dots" size="lg" />
            </Stack>
          </Stack>
        </Card>

        {/* Typography Showcase */}
        <Card variant="spacious">
          <Stack spacing="md">
            <div className="text-heading">Typography</div>
            <div className="text-title">Title Text</div>
            <div className="text-heading">Heading Text</div>
            <div className="text-subheading">Subheading Text</div>
            <div className="text-body">Body text with proper line height and spacing for readability.</div>
            <div className="text-small">Small text for secondary information</div>
            <div className="text-caption">Caption text for minimal details</div>
          </Stack>
        </Card>
      </Stack>
    </div>
  );
};

export default UIShowcase;