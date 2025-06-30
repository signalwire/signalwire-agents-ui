import { ReactNode } from 'react'

export const helpContent = {
  // Agent Builder Help
  agent: {
    name: 'Give your agent a descriptive name that reflects its purpose',
    description: 'Provide a brief description of what this agent does and its main responsibilities',
    language: 'Select the primary language and voice for your agent. You can create custom configurations in Admin settings',
    voice: (
      <div className="space-y-2">
        <p><strong>Voice Options:</strong></p>
        <p>• <strong>ElevenLabs</strong>: High-quality AI voices with natural intonation</p>
        <p>• <strong>Rime</strong>: SignalWire's ultra-low latency voice engine</p>
        <p>• <strong>Custom</strong>: Use your own voice ID or configuration</p>
      </div>
    ),
  },

  // Prompt Builder Help
  prompt: {
    sections: 'Organize your agent\'s instructions into logical sections. Each section should focus on a specific aspect of the agent\'s behavior',
    title: 'Give each section a clear, descriptive title (e.g., "Customer Service Guidelines", "Technical Knowledge")',
    body: 'The main content of this section. Be specific and clear about what the agent should do',
    bullets: 'Use bullet points to list specific rules, examples, or key information. One item per line',
  },

  // Skills Help
  skills: {
    overview: 'Skills add capabilities to your agent like web search, calculations, or API integrations',
    params: 'Some skills require configuration like API keys or specific settings. Check the skill documentation for details',
    apiKeys: (
      <div className="space-y-2">
        <p><strong>API Key Management:</strong></p>
        <p>• Store API keys as environment variables for security</p>
        <p>• Never commit API keys to version control</p>
        <p>• Each skill documents its required credentials</p>
      </div>
    ),
  },

  // AI Parameters Help
  params: {
    endOfSpeechTimeout: 'How long (in ms) to wait for the caller to finish speaking before processing. Default: 700ms',
    attentionTimeout: 'Maximum time (in ms) to wait for caller input before timing out. Default: 5000ms',
    model: 'The AI model to use. Newer models are more capable but may have higher latency',
    temperature: 'Controls response creativity (0-1). Lower = more consistent, Higher = more creative',
    maxTokens: 'Maximum length of AI responses. Higher values allow longer responses',
  },

  // Hints Configuration Help
  hints: {
    simple: (
      <div className="space-y-2">
        <p><strong>Simple Hints:</strong></p>
        <p>Help the AI understand specific terms, names, or jargon:</p>
        <p>• Product names: "SignalWire", "SWML"</p>
        <p>• Technical terms: "VoIP", "WebRTC"</p>
        <p>• Company-specific acronyms</p>
      </div>
    ),
    pattern: (
      <div className="space-y-2">
        <p><strong>Pattern Hints:</strong></p>
        <p>Use regex patterns to match and normalize variations:</p>
        <p>• Phone numbers: Match "(xxx) xxx-xxxx" → "xxx-xxx-xxxx"</p>
        <p>• Product codes: Match "PROD-####" format</p>
        <p>• Email patterns: Validate email formats</p>
      </div>
    ),
  },

  // Pronunciations Help
  pronunciations: {
    overview: 'Teach the AI how to pronounce specific words or phrases correctly',
    example: (
      <div className="space-y-2">
        <p><strong>Examples:</strong></p>
        <p>• "SQL" → "sequel" or "S-Q-L"</p>
        <p>• "nginx" → "engine-x"</p>
        <p>• Company names with unique pronunciations</p>
      </div>
    ),
  },

  // Global Data Help
  globalData: {
    overview: 'Store data that persists throughout the conversation and can be accessed by skills',
    usage: (
      <div className="space-y-2">
        <p><strong>Common Uses:</strong></p>
        <p>• API endpoints and configuration</p>
        <p>• Business hours and timezone</p>
        <p>• Product catalogs or pricing</p>
        <p>• Company policies and procedures</p>
      </div>
    ),
  },

  // Native Functions Help
  nativeFunctions: {
    overview: 'Built-in SignalWire functions for common agent tasks',
    functions: {
      next_step: 'Navigate to the next step in a workflow',
      change_context: 'Switch between different conversation contexts',
      end_conversation: 'Gracefully end the call',
      transfer_call: 'Transfer to another agent or phone number',
    },
    fillers: 'Custom phrases to say while executing functions (e.g., "One moment please..." while transferring)',
  },

  // Recording Configuration Help
  recording: {
    overview: (
      <div className="space-y-2">
        <p><strong>Call Recording:</strong></p>
        <p>⚠️ <strong>Legal Notice:</strong> You must comply with all applicable laws regarding call recording</p>
        <p>• Always inform callers they are being recorded</p>
        <p>• Check local and federal recording consent laws</p>
        <p>• Some states require two-party consent</p>
      </div>
    ),
    format: {
      mp4: 'Compressed format, smaller file size, good for storage',
      wav: 'Uncompressed format, higher quality, larger files',
    },
    stereo: 'Records caller and agent on separate audio channels for better analysis',
  },

  // Post-Prompt Summary Help
  postPrompt: {
    overview: 'Automatically generate summaries after each conversation',
    builtin: 'View summaries directly in the Agent Builder dashboard with structured insights',
    custom: 'Send summaries to your own webhook for custom processing or integration with other systems',
    webhookFormat: (
      <div className="space-y-2">
        <p><strong>Webhook receives:</strong></p>
        <p>• Conversation transcript</p>
        <p>• Key points and action items</p>
        <p>• Sentiment analysis</p>
        <p>• Call metadata and duration</p>
      </div>
    ),
  },

  // Contexts & Steps Help
  contexts: {
    overview: (
      <div className="space-y-2">
        <p><strong>Contexts & Steps:</strong></p>
        <p>Build structured conversation flows:</p>
        <p>• <strong>Contexts</strong>: Different conversation modes (sales, support, manager)</p>
        <p>• <strong>Steps</strong>: Sequential stages within each context</p>
        <p>• <strong>Navigation</strong>: Control flow between steps and contexts</p>
      </div>
    ),
    isolated: 'Isolated contexts have their own function scope and don\'t share tools with other contexts',
    criteria: 'Define what must be completed before moving to the next step',
    validSteps: 'Specify which steps the agent can navigate to from this step',
    validContexts: 'Allow switching to specific contexts (e.g., escalate to manager)',
    restrictedFunctions: 'Limit which tools are available in this step for focused interactions',
    enterFillers: 'Custom messages to play when entering this context (e.g., "Transferring to manager...")',
  },

  // Skills Marketplace Help
  marketplace: {
    overview: 'Browse, install, and manage skills to extend your agent\'s capabilities',
    categories: {
      utilities: 'Basic tools like date/time, math calculations',
      'external-apis': 'Integrations with third-party services',
      knowledge: 'Information retrieval and search capabilities',
      enterprise: 'Advanced business process integrations',
      telephony: 'Call control and telephony features',
    },
    requirements: (
      <div className="space-y-2">
        <p><strong>Before Installing:</strong></p>
        <p>• Check required environment variables</p>
        <p>• Ensure you have necessary API keys</p>
        <p>• Review Python package dependencies</p>
        <p>• Test in development first</p>
      </div>
    ),
    customSkills: (
      <div className="space-y-2">
        <p><strong>Upload Custom Skills:</strong></p>
        <p>ZIP file must contain:</p>
        <p>• <code>skill.py</code> - SkillBase implementation</p>
        <p>• <code>README.md</code> - Documentation (optional)</p>
        <p>• <code>requirements.txt</code> - Dependencies (optional)</p>
      </div>
    ),
  },

  // General Tips
  tips: {
    testing: 'Always test your agent thoroughly before deploying to production',
    security: 'Use environment variables for sensitive data like API keys and passwords',
    performance: 'Keep prompts concise and focused for better response times',
    documentation: 'Document your agent\'s capabilities and any special configurations',
  },
} as const

// Helper function to get nested help content
export function getHelpContent(path: string): string | ReactNode {
  const keys = path.split('.')
  let content: any = helpContent
  
  for (const key of keys) {
    content = content?.[key]
    if (!content) return 'Help content not found'
  }
  
  return content
}