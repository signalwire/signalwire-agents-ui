# Skill Testing Architecture

## Overview

This document outlines the architecture for implementing skill testing functionality in the SignalWire Agent Builder UI, inspired by the `swaig-test` CLI tool. The core concept is to leverage ephemeral agents and the existing `on_function_call()` infrastructure to provide consistent testing that mirrors production behavior.

## Architecture Principles

1. **Consistency**: Testing should use the exact same code path as production SWAIG webhooks
2. **Isolation**: Each test runs in an ephemeral agent instance that is cleaned up after execution
3. **Realism**: Tests receive the same `post_data` structure as production webhooks
4. **Security**: All tests require authentication and have appropriate timeouts/limits

## System Components

### 1. Ephemeral Agent Infrastructure

Ephemeral agents are temporary agent instances created for:
- SWML generation
- Skill testing
- SWAIG webhook handling

Key characteristics:
- Short-lived (created, used, destroyed)
- Minimal configuration (only required skills)
- No server startup (intercept `serve()` calls)
- Full skill lifecycle (setup → execute → cleanup)

### 2. Unified Function Execution Path

All function calls flow through the same path:

```
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│   SWAIG Webhook     │     │   Skill Testing     │     │   Direct Call       │
│  (from SignalWire)  │     │    (from UI)        │     │  (future uses)      │
└──────────┬──────────┘     └──────────┬──────────┘     └──────────┬──────────┘
           │                           │                           │
           └───────────────────────────┴───────────────────────────┘
                                      │
                                      ▼
                         ┌─────────────────────────┐
                         │   Ephemeral Agent       │
                         │   Creation              │
                         └──────────┬──────────────┘
                                    │
                                    ▼
                         ┌─────────────────────────┐
                         │   agent.on_function_call│
                         │   (skill, function,     │
                         │    args, post_data)     │
                         └──────────┬──────────────┘
                                    │
                                    ▼
                         ┌─────────────────────────┐
                         │   SWAIG Response        │
                         │   (action, response,    │
                         │    metadata)            │
                         └─────────────────────────┘
```

### 3. Mock Post Data Structure

For testing, we generate realistic `post_data`:

```python
{
    "function": "search_web",
    "argument": {
        "parsed": [{
            "query": "SignalWire documentation"
        }],
        "raw": '{"query": "SignalWire documentation"}'
    },
    "call_id": "test-uuid-12345",
    "call": {
        "call_id": "test-uuid-12345",
        "node_id": "test-node",
        "segment_id": "test-segment",
        "call_state": "testing",
        "direction": "inbound",
        "type": "test",
        "from": "+1234567890",
        "to": "+1234567891",
        "headers": {},
        "vars": {}
    },
    "vars": {}
}
```

## Implementation Plan

### Phase 1: Refactor SWAIG Webhook Handler

**Current State**: Manual skill instantiation and handler calls
**Target State**: Ephemeral agent with `on_function_call()`

```python
# Current approach in /backend/api/swaig.py
skill_instance = SkillClass()
result = skill_instance.handler(args)

# New approach
agent = AgentBase(name=f"swaig-{agent_id}")
agent.add_skill(skill_name, skill_params)
agent.initialize()
result = await agent.on_function_call(function_name, args, post_data)
agent.cleanup()
```

Benefits:
- Consistent execution path
- Proper skill lifecycle management
- Automatic error handling
- Standard SWAIG response format

### Phase 2: Skill Testing API

**Endpoint**: `POST /api/skills/test`

**Request**:
```json
{
    "skill_name": "web_search",
    "skill_params": {
        "api_key": "...",
        "search_engine_id": "..."
    },
    "function_name": "search_web",
    "test_args": {
        "query": "SignalWire AI agents"
    }
}
```

**Response**:
```json
{
    "success": true,
    "result": {
        "action": "return",
        "response": "Found 3 results for 'SignalWire AI agents'...",
        "metadata": {}
    },
    "execution_time": 0.523,
    "logs": []
}
```

### Phase 3: Function Metadata Extraction

To support the test UI, we need to extract:
- Available functions per skill
- Function parameter schemas
- Parameter types and constraints

Sources:
1. Skill's registered tools (via `register_tools()`)
2. Function signatures (via introspection)
3. Manual metadata (future enhancement)

### Phase 4: Frontend Testing UI

**Components**:

1. **TestSkillDialog**
   - Function selector dropdown
   - Dynamic argument form
   - Execute button
   - Results display

2. **Argument Form Generation**
   - Text inputs for strings
   - Number inputs for integers/floats
   - Checkboxes for booleans
   - JSON editor for objects/arrays

3. **Results Display**
   - Success: Pretty-printed JSON response
   - Error: Error message and stack trace
   - Metadata: Execution time, logs

## Security Considerations

1. **Authentication**: All test requests require valid JWT
2. **Rate Limiting**: Maximum 10 tests per minute per user
3. **Timeouts**: 30-second timeout for test execution
4. **Resource Limits**: Memory and CPU limits for ephemeral agents
5. **Sandboxing**: No access to system resources or other agents

## Error Handling

1. **Skill Setup Failures**: Clear messages about missing API keys or configuration
2. **Function Not Found**: List available functions for the skill
3. **Argument Validation**: Show required/optional parameters
4. **Execution Errors**: Capture and display skill-specific errors
5. **Timeout Errors**: Indicate when tests exceed time limits

## Future Enhancements

1. **Test History**: Store recent test executions per user
2. **Test Templates**: Save common test scenarios
3. **Batch Testing**: Run multiple tests in sequence
4. **Mock Mode**: Test without external API calls
5. **Performance Metrics**: Track execution times and resource usage

## Benefits of This Architecture

1. **Unified Code Path**: Testing, webhooks, and future uses share the same execution logic
2. **Realistic Testing**: Tests run in the same environment as production
3. **Maintainability**: Single implementation to maintain
4. **Extensibility**: Easy to add new testing features
5. **Developer Experience**: Immediate feedback on skill functionality

## Migration Path

1. **Step 1**: Implement ephemeral agent creation utility
2. **Step 2**: Refactor SWAIG webhook handler
3. **Step 3**: Add skill testing endpoint
4. **Step 4**: Build frontend testing UI
5. **Step 5**: Deprecate manual handler approach

## Conclusion

By leveraging ephemeral agents and the SDK's `on_function_call()` infrastructure, we create a robust testing system that mirrors production behavior while providing developers with immediate feedback on their skill configurations. This architecture ensures consistency, security, and maintainability while enabling future enhancements.