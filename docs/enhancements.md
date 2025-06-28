# SignalWire Agent Builder UI Enhancements

This document outlines the new configuration cards to be added to the Agent Builder UI based on the SignalWire SDK agent base class methods.

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

## 6. Webhook Configuration Card

### Description
Configure custom webhook URLs for SWAIG functions and post-prompt summaries.

### SDK Methods
Located in `signalwire_agents/core/mixins/routing_mixin.py`:
```python
def set_web_hook_url(self, url: str) -> 'RoutingMixin'
def set_post_prompt_url(self, url: str) -> 'RoutingMixin'
def add_swaig_query_params(self, params: Dict[str, str]) -> 'RoutingMixin'
def clear_swaig_query_params(self) -> 'RoutingMixin'
```

### UI Implementation
- SWAIG Webhook URL input field
- Post-Prompt Summary configuration:
  - Toggle: Use default renderer (enabled by default)
  - When default renderer enabled: Show preview/example of summary UI
  - When disabled: Custom URL input field
- Query Parameters key-value editor
- Validation for URL format

### Post-Prompt Summary Behavior
- Default: Post-prompt summaries are sent to the Agent Builder backend and rendered in a custom UI
- Custom: If user provides a custom URL, summaries are sent there instead and default renderer is disabled

### Example Usage
```python
# Custom SWAIG webhook
agent.set_web_hook_url("https://api.example.com/swaig")

# Custom post-prompt URL (disables default renderer)
agent.set_post_prompt_url("https://api.example.com/summaries")

# Add query parameters
agent.add_swaig_query_params({
    "api_key": "secret123",
    "session_id": "abc456"
})
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
6. **Webhook Configuration** - Critical for integrations
7. **Contexts & Steps** - Advanced feature for complex workflows

## Backend API Requirements

Each configuration card will need corresponding API endpoints to:
- Save configuration to the agent
- Validate input (regex patterns, URLs, etc.)
- Provide lists of available options (native functions, etc.)
- Generate proper SWML with these configurations

## Notes

- All configuration should be stored in the agent's config in the database
- The SWML generator needs to be updated to include these configurations
- Consider adding import/export functionality for complex configurations
- Add tooltips and examples for each configuration option
- Validate regex patterns in pattern hints before saving