# SWAIG Fillers Editor Plan

## Problem
When editing skills like web_search, the `swaig_fields` parameter expects a JSON object but displays as a text input showing "[object Object]". This is particularly problematic for configuring fillers.

## Solution
Create a specialized inline editor for `swaig_fields` that focuses on the fillers use case.

## Fillers Structure
```json
{
  "fillers": {
    "default": [
      // Used when caller's language doesn't match any specific language
      "Let me search for that...",
      "Looking that up..."
    ],
    "en-US": [
      "Let me search Wikipedia for that information...",
      "Checking Wikipedia's knowledge base..."
    ],
    "es-MX": [
      "Déjame buscar eso en Wikipedia...",
      "Consultando la base de conocimientos..."
    ]
  }
}
```

## Implementation Plan

### 1. Create FillersEditor Component
Location: `/frontend/src/components/agents/FillersEditor.tsx`

Features:
- Language tabs (default + language codes)
- Add/remove languages (except default)
- Add/remove/edit filler phrases per language
- No modal stacking - inline replacement of the input field

### 2. Modify SkillConfigDialog
In `SkillsSelector.tsx`, detect when `param.name === 'swaig_fields'`:
- Replace the `<Input>` with `<FillersEditor>`
- Pass current value and onChange handler
- Handle JSON serialization/deserialization

### 3. UI Design (Inline Expansion)
```
SWAIG Function Metadata (optional)
┌────────────────────────────────────┐
│ [Default] [en-US] [+ Add Language] │
│                                    │
│ Default:                           │
│ • Let me search for that...    [×]│
│ • Looking that up...           [×]│
│ [+ Add phrase]                     │
└────────────────────────────────────┘
```

### 4. Component Props
```typescript
interface FillersEditorProps {
  value: any; // Current swaig_fields value
  onChange: (value: any) => void;
  skillType?: string; // To provide appropriate default fillers
}
```

### 5. Default Fillers by Skill Type
- **search skills**: "Let me search for that...", "Looking that up..."
- **weather skills**: "Checking the weather...", "Getting weather information..."
- **api skills**: "Fetching that data...", "Processing your request..."

### 6. State Management
- Convert between JSON structure and UI state
- Validate structure before saving
- Handle empty states gracefully
- Preserve other swaig_fields properties if present

### 7. Edge Cases
- Handle when swaig_fields has other properties besides fillers
- Empty fillers array
- Invalid JSON in existing data
- Migration from old format

## Files to Modify
1. `/frontend/src/components/agents/SkillsSelector.tsx` - Add FillersEditor detection
2. `/frontend/src/components/agents/FillersEditor.tsx` - New component
3. Update types/interfaces as needed

## Testing Notes
- Test with existing skills that have swaig_fields
- Test with empty/new skills
- Test language switching
- Test adding/removing fillers
- Verify JSON output is correct