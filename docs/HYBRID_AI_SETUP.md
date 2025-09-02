# Hybrid AI Infrastructure Setup

This document explains how to set up and use the hybrid AI infrastructure for the Newsletter Grading System.

## Overview

The hybrid AI system uses:
- **Primary**: Llama 3.2 (local, private, fast)
- **Fallback**: OpenAI GPT-4o-mini (cloud, reliable, consistent)

The system automatically switches between models based on health and availability.

## Quick Setup

### 1. Install Ollama and Llama 3.2

```bash
# Run the automated setup script
npm run setup:ollama
```

This script will:
- Install Ollama on your system
- Download the Llama 3.2 model (~2GB)
- Start the Ollama service
- Test the setup

### 2. Configure OpenAI (Optional but Recommended)

Create a `.env` file in the project root:

```bash
# OpenAI API key for fallback
OPENAI_API_KEY=your_openai_api_key_here
```

### 3. Test the Setup

```bash
# Test the hybrid AI system
npm run test:hybrid-ai
```

### 4. Start the Server

```bash
# Start with hybrid AI support
npm run dev:server
```

## Manual Setup

### Installing Ollama

**macOS:**
```bash
# Using Homebrew
brew install ollama

# Or using the installer
curl -fsSL https://ollama.ai/install.sh | sh
```

**Linux:**
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

**Windows:**
Download from [ollama.ai/download](https://ollama.ai/download)

### Downloading Llama 3.2

```bash
# Start Ollama service
ollama serve

# In another terminal, pull the model
ollama pull llama3.2
```

## System Architecture

```
User Request
     ↓
Hybrid AI Router
     ↓
┌─────────────────┐    ┌──────────────────┐
│   Llama 3.2     │    │  OpenAI GPT-4o   │
│   (Primary)     │    │  (Fallback)      │
│                 │    │                  │
│ • Local         │    │ • Cloud          │
│ • Private       │    │ • Reliable       │
│ • Fast          │    │ • Consistent     │
│ • Free          │    │ • Paid           │
└─────────────────┘    └──────────────────┘
```

## API Endpoints

### Newsletter Analysis
```bash
POST /api/newsletter/analyze
Content-Type: application/json

{
  "message": "Your newsletter content here..."
}
```

### Newsletter Improvement
```bash
POST /api/newsletter/improve
Content-Type: application/json

{
  "message": "Tagged newsletter content here..."
}
```

### Model Status
```bash
GET /api/health/models
```

### Manual Model Switching
```bash
POST /api/models/switch
Content-Type: application/json

{
  "force": "openai"  // or "llama"
}
```

## Configuration

The hybrid AI router can be configured in `server/ai-router.ts`:

```typescript
const DEFAULT_CONFIG: AIRouterConfig = {
  primaryModel: 'llama3.2',
  fallbackModel: 'gpt-4o-mini',
  healthCheckInterval: 30000, // 30 seconds
  fallbackThreshold: 3, // failures before fallback
  loadBalancing: true,
  ollamaPort: 11434,
  openaiApiKey: process.env.OPENAI_API_KEY,
};
```

## System Prompts

The system uses custom prompts located in:
- `Systemprompts/SystemPrompt_GM.txt` - For newsletter analysis
- `Systemprompts/SystemPrompt_FM.txt` - For newsletter improvement

These prompts are automatically loaded by the hybrid AI router.

## Health Monitoring

The system continuously monitors model health:

- **Health checks** every 30 seconds
- **Automatic failover** after 3 consecutive failures
- **Response time tracking** for performance monitoring
- **Graceful degradation** to ensure service availability

## Troubleshooting

### Ollama Issues

**Problem**: Ollama not starting
```bash
# Check if Ollama is running
ps aux | grep ollama

# Start Ollama manually
ollama serve

# Check Ollama status
curl http://localhost:11434/api/tags
```

**Problem**: Llama 3.2 model not found
```bash
# List available models
ollama list

# Pull Llama 3.2 if missing
ollama pull llama3.2
```

### OpenAI Issues

**Problem**: OpenAI API key not working
- Verify your API key in the `.env` file
- Check your OpenAI account has credits
- Ensure the key has proper permissions

### Performance Issues

**Problem**: Slow responses
- Check model health: `GET /api/health/models`
- Monitor response times in logs
- Consider adjusting `fallbackThreshold` in config

## Monitoring

### Health Check Endpoint
```bash
curl http://localhost:3001/api/health/models
```

Response includes:
- Model health status
- Response times
- Failure counts
- Current primary model

### Logs

The system provides detailed logging:
- Model switching events
- Health check results
- Performance metrics
- Error details

## Production Considerations

### Security
- Keep OpenAI API keys secure
- Use environment variables for configuration
- Monitor API usage and costs

### Performance
- Consider running multiple Ollama instances
- Implement response caching
- Monitor memory usage for local models

### Reliability
- Set up monitoring alerts
- Configure backup OpenAI keys
- Plan for model updates

## Development

### Testing
```bash
# Test the hybrid system
npm run test:hybrid-ai

# Test specific endpoints
curl -X POST http://localhost:3001/api/newsletter/analyze \
  -H "Content-Type: application/json" \
  -d '{"message": "Test newsletter content"}'
```

### Debugging
- Enable debug logging in `server/ai-router.ts`
- Check health status regularly
- Monitor console output for errors

## FAQ

**Q: Why use both local and cloud models?**
A: Local models provide privacy and speed, while cloud models ensure reliability and consistency.

**Q: What happens if both models fail?**
A: The system falls back to mock responses to maintain service availability.

**Q: Can I use different models?**
A: Yes, modify the configuration in `server/ai-router.ts` to use different models.

**Q: How much does this cost?**
A: Llama 3.2 is free to run locally. OpenAI charges per token used (~$0.0001-0.0002 per 1K tokens).

**Q: Is my data private?**
A: When using Llama 3.2 locally, your data never leaves your machine. OpenAI fallback sends data to their servers.