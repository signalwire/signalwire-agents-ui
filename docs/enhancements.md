# SignalWire Agent Builder UI Enhancements

This document outlines the new configuration cards to be added to the Agent Builder UI based on the SignalWire SDK agent base class methods, plus admin features for managing the skills marketplace.

## Summary of Enhancements

### Agent Configuration Cards:
1. **Hints Configuration** - Simple text hints and regex pattern hints
2. **Pronunciations Configuration** - Custom word pronunciations  
3. **Global Data Configuration** - Persistent key-value data
4. **Native Functions & Fillers** - Built-in functions with custom phrases
5. **Recording Configuration** - Call recording settings
6. **Post-Prompt Summary Configuration** - Built-in viewer or custom URL
7. **Contexts & Steps Configuration** - Advanced conversation flows

### Admin Features:
- **Skills Marketplace Management** - Control which skills appear in the marketplace

## 1. Hints Configuration Card

### Description
Configure hints to help the AI understand specific words, phrases, or patterns better. Two types of hints are supported:
- **Simple Hints**: Plain text hints for common terms
- **Pattern Hints**: Regular expression-based hints for formatted data

### SDK Methods
Located in `signalwire_agents/core/mixins/ai_config_mixin.py`:
```python
def add_hint(self, hint: str) -> 'AIConfigMixin'
def add_hints(self, hints: List[str]) -> 'AIConfigMixin'
def add_pattern_hint(self, hint: str, pattern: str, replace: str, ignore_case: bool = False) -> 'AIConfigMixin'
```

### UI Implementation
- Text area for simple hints (one per line)
- Pattern hints table with columns: Hint, Pattern (regex), Replace Text, Case Insensitive
- Add/Remove buttons for pattern hints

### Example Usage
```python
# Simple hints
agent.add_hint("ACME Corporation is our company name")
agent.add_hint("SKU means Stock Keeping Unit")

# Pattern hints
agent.add_pattern_hint("order number", r"ORD-\d{6}", "order identifier", ignore_case=True)
agent.add_pattern_hint("product code", r"PROD-[A-Z]{3}-\d{4}", "product SKU")
```

## 2. Pronunciations Configuration Card

### Description
Configure custom pronunciations to help the AI speak certain words correctly.

### SDK Methods
Located in `signalwire_agents/core/mixins/ai_config_mixin.py`:
```python
def add_pronunciation(self, replace: str, with_text: str, ignore_case: bool = False) -> 'AIConfigMixin'
def set_pronunciations(self, pronunciations: List[Dict[str, Any]]) -> 'AIConfigMixin'
```

### UI Implementation
- Table with columns: Word/Phrase, Pronunciation, Case Insensitive
- Add/Remove buttons
- Preview/Test pronunciation button (future enhancement)

### Example Usage
```python
agent.add_pronunciation("SQL", "sequel")
agent.add_pronunciation("ACME", "ack-me")
agent.add_pronunciation("CEO", "C E O", ignore_case=True)
```

## 3. Global Data Configuration Card

### Description
Set persistent data that's available to the AI throughout the entire conversation.

### SDK Methods
Located in `signalwire_agents/core/mixins/ai_config_mixin.py`:
```python
def set_global_data(self, data: Dict[str, Any]) -> 'AIConfigMixin'
def update_global_data(self, data: Dict[str, Any]) -> 'AIConfigMixin'
```

### UI Implementation
- Key-value pair editor
- Support for strings, numbers, booleans, and JSON objects
- Add/Remove buttons for entries
- JSON editor mode for complex data

### Example Usage
```python
agent.set_global_data({
    "company_name": "ACME Corporation",
    "support_hours": "9 AM - 5 PM EST",
    "website": "www.example.com",
    "emergency_number": "1-800-HELP"
})
```

## 4. Native Functions & Fillers Configuration Card

### Description
Enable built-in SignalWire functions and configure custom phrases the AI says while executing them.

### SDK Methods
Located in `signalwire_agents/core/mixins/ai_config_mixin.py`:
```python
def set_native_functions(self, function_names: List[str]) -> 'AIConfigMixin'
def set_internal_fillers(self, internal_fillers: Dict[str, Dict[str, List[str]]]) -> 'AIConfigMixin'
def add_internal_filler(self, function_name: str, language_code: str, fillers: List[str]) -> 'AIConfigMixin'
```

### UI Implementation
- Checkbox list of available native functions (will need to ask for list)
- For each enabled function, expandable section for filler phrases
- Language-specific filler configuration
- Add/Remove buttons for filler phrases

### Available Native Functions (to be provided)
Will need to request the list of available native functions from the SDK.

### Example Usage
```python
# Enable native functions
agent.set_native_functions(["wait_for_user", "next_step", "check_time"])

# Configure fillers
agent.add_internal_filler("wait_for_user", "en-US", [
    "Please take your time...",
    "I'll wait for your response...",
    "No rush, I'm here when you're ready..."
])
```

## 5. Recording Configuration Card

### Description
Configure call recording settings for compliance and quality assurance.

### SDK Methods
Located in `signalwire_agents/core/agent_base.py` constructor:
```python
def __init__(self, ..., record_call: bool = False, record_format: str = "mp4", record_stereo: bool = True, ...)
```

### UI Implementation
- Toggle: Enable/Disable recording
- Dropdown: Format selection (mp4, wav)
- Toggle: Stereo/Mono recording
- Info text about compliance and storage

### Example Usage
```python
agent = AgentBase(
    name="Support Agent",
    record_call=True,
    record_format="mp4",
    record_stereo=True
)
```

## 6. Post-Prompt Summary Configuration Card

### Description
Configure how conversation summaries are handled after calls end.

### SDK Methods
Located in `signalwire_agents/core/mixins/routing_mixin.py`:
```python
def set_post_prompt_url(self, url: str) -> 'RoutingMixin'
```

### UI Implementation
- Post-Prompt Summary configuration:
  - Toggle: Use built-in summary viewer (enabled by default)
  - When enabled: Show preview/example of the summary UI (to be implemented)
  - When disabled: Custom URL input field for external handling
- Validation for URL format when custom URL is used

### Post-Prompt Summary Behavior
- Default: Post-prompt summaries are sent to the Agent Builder backend and displayed in a built-in viewer
- Custom: If user provides a custom URL, summaries are sent there instead and built-in viewer is disabled

### Example Usage
```python
# Use default built-in viewer (no code needed)

# OR use custom post-prompt URL (disables built-in viewer)
agent.set_post_prompt_url("https://api.example.com/summaries")
```

## 7. Contexts & Steps Configuration Card (Advanced)

### Description
Define structured conversation flows with contexts and steps for complex agent behaviors.

### SDK Methods
Located in `signalwire_agents/core/contexts.py`:
```python
# Context definition
contexts = agent.define_contexts()
context = contexts.add_context("context_name")
context.set_isolated(True)  # Isolated memory between contexts
context.add_section("section_name", "content")
context.add_bullets("section_name", ["bullet1", "bullet2"])
context.add_enter_filler("language_code", ["filler1", "filler2"])

# Step definition
step = context.add_step("step_name")
step.add_section("section_name", "content")
step.add_bullets("section_name", ["bullet1", "bullet2"])
step.set_step_criteria("completion criteria")
step.set_valid_steps(["next_step1", "next_step2"])
step.set_valid_contexts(["context1", "context2"])
```

### UI Implementation
- Tree view of contexts and their steps
- Context editor:
  - Name, isolated toggle
  - Sections (like prompt builder)
  - Enter fillers per language
- Step editor:
  - Name, sections
  - Completion criteria
  - Valid next steps (dropdown)
  - Valid contexts for switching (dropdown)
- Visual flow diagram (future enhancement)

### Example from contexts_demo.py
```python
# Define a sales context with steps
sales_context = contexts.add_context("sales") \
    .set_isolated(True) \
    .add_section("Role", "You are Franklin, a helpful computer sales agent.")

# Add a step to the context
sales_context.add_step("determine_use_case") \
    .add_section("Current Task", "Identify the customer's primary computer use case") \
    .add_bullets("Required Information", [
        "What will they use the computer for?",
        "Gaming, work, or balanced use?"
    ]) \
    .set_step_criteria("Customer has stated their use case") \
    .set_valid_steps(["determine_form_factor"]) \
    .set_valid_contexts(["tech_support", "manager"])
```

## Implementation Priority

1. **Hints Configuration** - Essential for improving AI understanding
2. **Pronunciations Configuration** - Important for proper speech output
3. **Global Data Configuration** - Useful for context persistence
4. **Native Functions & Fillers** - Expands agent capabilities
5. **Recording Configuration** - Important for compliance
6. **Post-Prompt Summary Configuration** - For conversation tracking
7. **Contexts & Steps** - Advanced feature for complex workflows

## Backend API Requirements

Each configuration card will need corresponding API endpoints to:
- Save configuration to the agent
- Validate input (regex patterns, URLs, etc.)
- Provide lists of available options (native functions, etc.)
- Generate proper SWML with these configurations

## Admin Features

### Skills Marketplace Management

#### Description
Admin interface to control which skills are advertised in the skills marketplace and manage the overall skills ecosystem. The system automatically detects new skills when the SDK is updated.

#### How It Works
1. Skills are dynamically loaded from the SignalWire SDK's skill registry
2. When you update the SDK, new skills automatically appear
3. Admin settings (visibility, featured status, etc.) are stored in the database
4. The marketplace shows the intersection of: available SDK skills + admin visibility settings

#### UI Implementation (Admin Panel)
- Skills management table with columns:
  - Skill name (from SDK)
  - Description (from SDK, editable override)
  - Category (admin-defined)
  - Status (Visible/Hidden/Featured) - stored in DB
  - Usage count (tracked in DB)
  - Source (SDK/Custom)
  - Last detected (when skill first appeared)
- Actions per skill:
  - Toggle visibility in marketplace
  - Mark as featured
  - Override description
  - Set category
  - View usage statistics
- Bulk actions:
  - Enable/disable multiple skills
  - Export skill usage report
  - Sync with SDK (detect new/removed skills)
- SDK Sync indicator:
  - Shows newly detected skills after SDK update
  - Alerts for removed skills that were previously visible

#### Database Schema
```sql
-- Skill metadata stored in database
CREATE TABLE skill_settings (
    skill_name VARCHAR(100) PRIMARY KEY,  -- Matches SDK skill name
    is_visible BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    category VARCHAR(50),
    custom_description TEXT,  -- Overrides SDK description if set
    usage_count INTEGER DEFAULT 0,
    first_detected TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### API Endpoints
- `GET /api/admin/skills` - List all skills (SDK + admin metadata)
- `PUT /api/admin/skills/{skill_name}/settings` - Update admin settings
- `POST /api/admin/skills/sync` - Force sync with SDK
- `GET /api/admin/skills/stats` - Get usage statistics
- `GET /api/skills` - Public endpoint (returns visible skills only)

## Notes

- All configuration should be stored in the agent's config in the database
- The SWML generator needs to be updated to include these configurations
- Consider adding import/export functionality for complex configurations
- Add tooltips and examples for each configuration option
- Validate regex patterns in pattern hints before saving
- Admin features require appropriate authentication and authorization