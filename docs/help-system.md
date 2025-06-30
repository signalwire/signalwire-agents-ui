# Help System Documentation

## Overview
A comprehensive inline help system has been added to the SignalWire Agent Builder UI to guide users through all features and configurations.

## Components Added

### 1. Help Tooltip Component (`/frontend/src/components/ui/help-tooltip.tsx`)
- Reusable component that displays a help icon (?) with tooltip on hover
- Supports custom positioning and content
- Can display plain text or React components

### 2. Tooltip Base Component (`/frontend/src/components/ui/tooltip.tsx`)
- Radix UI-based tooltip component
- Provides consistent styling and animations

### 3. Help Content Library (`/frontend/src/lib/helpContent.tsx`)
- Centralized repository of all help content
- Organized by feature area:
  - Agent configuration
  - Prompt building
  - Skills
  - AI parameters
  - Hints configuration
  - Pronunciations
  - Global data
  - Native functions
  - Recording settings
  - Post-prompt summaries
  - Contexts & Steps
  - Skills marketplace
  - Tips and best practices

### 4. Help Modal (`/frontend/src/components/help/HelpModal.tsx`)
- Comprehensive documentation modal
- Organized into tabs:
  - Getting Started
  - Agent Configuration
  - Skills
  - Advanced Features
  - Tips & Best Practices
- Accessible via help button in main navigation

## Integration Points

### Main Navigation
- Added help button (?) in the header
- Opens comprehensive help modal
- Always accessible from any page

### Inline Help Tooltips Added To:
1. **Agent Builder Page**
   - Agent name field
   - Description field
   - Language configuration

2. **Prompt Builder**
   - Section structure explanation
   - Title, body, and bullet point guidance

3. **Hints Configuration**
   - Simple hints explanation
   - Pattern hints with regex examples

4. **Contexts & Steps**
   - Context overview
   - Isolated contexts
   - Step completion criteria
   - Valid steps/contexts navigation
   - Function restrictions

5. **Skills Marketplace**
   - Main overview help
   - Category explanations
   - Installation requirements

## User Benefits

1. **Contextual Help**: Users get help exactly where they need it without leaving their workflow
2. **Progressive Disclosure**: Detailed information available on hover without cluttering the interface
3. **Comprehensive Documentation**: Full help modal provides in-depth guidance
4. **Best Practices**: Tips and recommendations for optimal configuration
5. **Troubleshooting**: Common issues and solutions documented

## Technical Implementation

- Uses Radix UI for accessible, keyboard-navigable tooltips
- Responsive design works on all screen sizes
- Consistent styling with the application theme
- No performance impact - help content loads on demand
- Easy to maintain - all content in one central location

## Future Enhancements

1. Search functionality in help modal
2. Video tutorials integration
3. Interactive examples
4. Context-sensitive help based on user actions
5. Multi-language support for help content