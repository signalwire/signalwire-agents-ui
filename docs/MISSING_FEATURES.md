# Missing Features Documentation

This document outlines features that are visible in the UI or API but are not yet implemented.

## Skills Marketplace

### Status: Not Implemented

The Skills tab has been hidden from the navigation as the feature is not fully implemented.

### Missing Functionality:

1. **Skill Enable/Disable Toggle**
   - The backend endpoint `/api/admin/skills/{skill_name}` exists but the toggle functionality is just a placeholder
   - No database table exists to store skill enable/disable states
   - The `toggle_skill` function returns a 501 Not Implemented error

2. **Skill State Persistence**
   - No mechanism to save which skills are enabled/disabled per user or system-wide
   - All installed skills are always available to agents

3. **Skill Management**
   - Install/uninstall functionality may not be fully implemented
   - No way to manage skill versions or updates

### What Would Be Needed:

To properly implement the Skills marketplace, the following would be required:

1. **Database Schema**
   ```sql
   CREATE TABLE skill_states (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       skill_name VARCHAR(255) NOT NULL,
       user_id VARCHAR(255),
       enabled BOOLEAN DEFAULT true,
       installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       UNIQUE(skill_name, user_id)
   );
   ```

2. **Backend Implementation**
   - Implement the `toggle_skill` function to save to database
   - Update skill loading to respect enabled/disabled state
   - Add skill installation/uninstallation tracking

3. **Frontend Updates**
   - Re-enable the Skills tab once backend is implemented
   - Add proper error handling for skill operations
   - Show skill status accurately

### Current Workaround:

All skills that are available in the system are automatically available to all agents. There is no way to selectively enable/disable skills.

## Other Partially Implemented Features

### 1. Contexts & Steps (Bedrock Agents)
- Contexts & Steps configuration is hidden for Bedrock agents as it's not supported by the voice-to-voice model
- The feature only works with SignalWire Native agents

### 2. Skill Enable/Disable in Agent Builder
- While agents can select which skills to use, there's no system-wide enable/disable functionality
- Skills selected in an agent configuration are always active if they exist in the system