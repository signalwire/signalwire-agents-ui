# mod_openai Application Parameters Documentation

This document lists all available parameters that can be passed to mod_openai applications through the `params` object in JSON configuration.

## Parameter Type Handling

- **String values**: Passed directly as strings
- **Boolean values**: Can be JSON booleans or strings ("true"/"false"), converted using `switch_true()` or `cJSON_FSTrue()`
- **Numeric values**: Can be JSON numbers or strings (e.g., 6000 or "6000"), converted using `atoi()`, `atol()`, or `atof()`
- **Generic parameters**: Any parameter not specifically handled is stored as a string in event headers

## Default Settings

The module uses two different default configurations:
- **Regular conversations**: Uses `default_settings()` with temperature=0.3f for creative responses
- **Post-processing**: Uses `default_post_settings()` with temperature=0.0f for deterministic responses

## Audio/Speech Processing Parameters

| Parameter | Type | Default | Range/Values | Description |
|-----------|------|---------|--------------|-------------|
| `energy_level` | double | 30 | 0.0-100 | VAD threshold converted to avg absolute sum |
| `end_of_speech_timeout` | int | 700ms | 0-10000ms | Timeout for end of speech detection |
| `first_word_timeout` | int | 0 | 0-10000ms | Timeout waiting for first word |
| `speech_event_timeout` | int | 60000ms | 0-10000ms | Speech event timeout |
| `digit_timeout` | int | 3000ms | 0-30000ms | DTMF digit timeout |
| `digit_terminators` | string | "#" | - | DTMF terminator characters |
| `initial_sleep_ms` | int | 0 | 0-300000ms | Initial sleep before processing |
| `speech_gen_quick_stops` | int | 3 | 0-10 | Number of quick stops for speech generation |

## AI Model & Processing Parameters

| Parameter | Type | Default | Range/Values | Description |
|-----------|------|---------|--------------|-------------|
| `ai_model` | string | gpt-4o | Limited to: gpt-4o-mini, gpt-4.1-mini, gpt-4.1-nano (any model in DEVELOPER_MODE) | AI model selection |
| `ai_model_62c3bdb19a89` | string | - | Any valid model | Special AI model override (backdoor, works in any mode) |
| `max_response_tokens` | int | 256 | 0-8192 | Max tokens in AI response |
| `enable_thinking` | boolean | false | - | Enable thinking mode |
| `thinking_model` | string | - | validated | Model for thinking mode |
| `vision_model` | string | - | validated | Model for vision processing |
| `enable_vision` | boolean | false | - | Enable vision capabilities |
| `pom_format` | string | - | "xml", "markdown" | Prompt format type |

## ASR (Speech Recognition) Parameters

| Parameter | Type | Default | Range/Values | Description |
|-----------|------|---------|--------------|-------------|
| `openai_asr_engine` | string | gcloud_speech_v2_async | - | ASR engine selection |
| `openai_gcloud_version` | string | - | - | Google Cloud version |
| `asr_diarize` | boolean | false | - | Enable speaker diarization |
| `asr_smart_format` | boolean | false | - | Smart formatting for ASR |
| `asr_speaker_affinity` | boolean | false | - | Speaker affinity for ASR |
| `llm_diarize_aware` | boolean | false | - | LLM awareness of diarization |
| `tts_number_format` | string | - | - | Number formatting for TTS |

## Conversation Control Parameters

| Parameter | Type | Default | Range/Values | Description |
|-----------|------|---------|--------------|-------------|
| `speak_when_spoken_to` | boolean | false | - | AI only responds when addressed by name (requires saying `ai_name`) |
| `enable_pause` | boolean | false | - | Enable pause functionality (use `wake_prefix` or any speech to unpause) |
| `start_paused` | boolean | false | - | Start in paused state (implies `enable_pause`=true) |
| `ai_name` | string | "computer" | - | AI assistant name (default when pause/speak_when_spoken_to enabled; should match system prompt) |
| `wake_prefix` | string | - | - | Wake word to unpause (if not set, any speech unpauses) |
| `wait_for_user` | boolean/int | 0 | 0, 1, 2, "answer_first" | AI waits for user to speak first before greeting |
| `static_greeting` | string | - | - | Static greeting message |
| `static_greeting_no_barge` | boolean | false | - | Prevent barge-in on greeting |
| `ai_volume` | int | 0 | - | AI voice volume level |

### Conversation Control Behaviors

**Pause/Unpause Mechanics:**
- When `enable_pause` or `start_paused` is true, the AI enters a paused state
- To unpause: Say the `wake_prefix` if configured, otherwise any speech will unpause
- While paused, the AI won't respond until unpaused

**Speak When Spoken To:**
- When enabled, the AI only responds when the user says its `ai_name`
- Example: If `ai_name` is "computer", user must say "computer" to get a response
- **Important**: The AI's name in the system prompt should match the `ai_name` parameter

**Wait for User:**
- When enabled, the AI waits for the user to speak first instead of immediately greeting
- Useful for scenarios where the AI should not initiate the conversation

## Function & Webhook Parameters

| Parameter | Type | Default | Range/Values | Description |
|-----------|------|---------|--------------|-------------|
| `functions_on_no_response` | boolean | false | - | Execute functions on no response |
| `function_wait_for_talking` | boolean | false | - | Wait for AI to finish talking before functions |
| `barge_functions` | boolean | false | - | Allow function execution during barge-in |
| `debug_webhook_url` | string | - | - | Debug webhook URL |
| `debug_webhook_level` | int | 0 | 0-2 | Webhook debug level |
| `swaig_post_swml_vars` | JSON | - | - | SWML variables for SWAIG |
| `swaig_post_conversation` | boolean | false | - | Post conversation to SWAIG |
| `swaig_allow_settings` | boolean | true | - | Allow SWAIG to change settings |
| `swaig_allow_swml` | boolean | true | - | Allow SWAIG to execute SWML |
| `swaig_set_global_data` | boolean | true | - | Allow SWAIG to set global data |

## Timeout & Flow Control Parameters

| Parameter | Type | Default | Range/Values | Description |
|-----------|------|---------|--------------|-------------|
| `attention_timeout` | int | 5000ms (inbound), 120000ms (outbound) | 10000-600000ms | Attention timeout |
| `inactivity_timeout` | int | 600000ms (10 min) | 10000-3600000ms | Inactivity timeout |
| `outbound_attention_timeout` | int | 120000ms | 10000-600000ms | Outbound attention timeout |
| `attention_timeout_prompt` | string | - | - | Prompt for attention timeout |
| `hard_stop_time` | string | - | - | Hard stop time |
| `hard_stop_prompt` | string | - | - | Hard stop prompt |
| `input_poll_freq` | int | 250ms | - | Input polling frequency |

## Interrupt & Barge-in Parameters

| Parameter | Type | Default | Range/Values | Description |
|-----------|------|---------|--------------|-------------|
| `acknowledge_interruptions` | int/bool | 1 | - | Acknowledge user interruptions (can be level or boolean) |
| `interrupt_prompt` | string | - | - | Prompt for interruptions |
| `interrupt_on_noise` | int/bool | 0 | - | Interrupt on noise detection (can be threshold or boolean) |
| `enable_barge` | boolean | true | - | Enable barge-in functionality |
| `barge_match_string` | string | - | - | String to match for barge-in |
| `barge_min_words` | int | 4 | - | Minimum words for barge-in |
| `transparent_barge` | boolean | true | - | Enable transparent barge-in |
| `transparent_barge_max_time` | long | 5000ms | - | Max time for transparent barge |

## Debug & Logging Parameters

| Parameter | Type | Default | Range/Values | Description |
|-----------|------|---------|--------------|-------------|
| `debug` | int/bool/string | 0 | - | Debug level (complex: can be number, boolean, or string) |
| `audible_debug` | boolean | false | - | Audible debug messages |
| `audible_latency` | boolean | false | - | Audible latency reporting |

## Media & Background Parameters

| Parameter | Type | Default | Range/Values | Description |
|-----------|------|---------|--------------|-------------|
| `background_file` | string | - | - | Background audio file |
| `background_file_loops` | int | -1 (infinite) | - | Number of loops |
| `background_file_volume` | int | 0 | - | Background volume |
| `hold_music` | string | - | - | Hold music file |
| `hold_on_process` | boolean | false | - | Play hold music during processing |

## Video Parameters

| Parameter | Type | Default | Range/Values | Description |
|-----------|------|---------|--------------|-------------|
| `video_talking_file` | string | - | - | Video file for talking state |
| `video_idle_file` | string | - | - | Video file for idle state |
| `video_listening_file` | string | - | - | Video file for listening state |

## Cloud Provider Parameters

### OpenAI Parameters
| Parameter | Type | Default | Range/Values | Description |
|-----------|------|---------|--------------|-------------|
| `openai_key` | string | - | - | OpenAI API key |

## Miscellaneous Parameters

| Parameter | Type | Default | Range/Values | Description |
|-----------|------|---------|--------------|-------------|
| `app_name` | string | - | - | Application name |
| `call_uuid` | string | - | - | Call UUID (auto-added from session) |
| `conscience` / `strict_mode` | string | "auto" | - | Conscience/strict mode setting |
| `persist_global_data` | boolean | true | - | Persist global data |
| `enable_accounting` | boolean | false | - | Enable accounting |
| `languages_enabled` | boolean | false | - | Enable language support |
| `local_tz` | string | - | - | Local timezone |
| `conversation_id` | string | - | - | Conversation identifier |
| `conversation_sliding_window` | int | 0 | - | Conversation window size |
| `cache_mode` | boolean | true | - | Enable cache mode |
| `max_emotion` | int | 0 | - | Maximum emotion level |
| `max_post_bytes_62c3bdb19a89` | int | 32768 (32KB) | - | Max POST bytes |
| `direction` | string | - | - | Call direction |
| `save_conversation` | boolean | false | - | Save conversation data |
| `summary_mode` | string | - | - | Summary generation mode |
| `transfer_summary` | boolean | false | - | Generate transfer summary |

## TTS Provider-Specific Parameters

### ElevenLabs TTS
| Parameter | Type | Default | Range/Values | Description |
|-----------|------|---------|--------------|-------------|
| `eleven_labs_key` | string | - | - | ElevenLabs API key |
| `eleven_labs_stability` | double | 0.50 | 0.0-1.0 | Voice stability |
| `eleven_labs_similarity` | double | 0.75 | 0.0-1.0 | Voice similarity |
| `eleven_labs_stream_first` | boolean | true | - | Stream-first mode |
| `eleven_labs_model` | string | eleven_turbo_v2_5 | See models list | Model selection |

### Azure TTS
| Parameter | Type | Default | Range/Values | Description |
|-----------|------|---------|--------------|-------------|
| `azure_tts_key` | string | - | - | Azure TTS key |

### OpenAI TTS
| Parameter | Type | Default | Range/Values | Description |
|-----------|------|---------|--------------|-------------|
| `openai_stream_first` | boolean | true | - | OpenAI stream-first |

### Other TTS Providers
| Parameter | Type | Default | Range/Values | Description |
|-----------|------|---------|--------------|-------------|
| `rime_model` | string | - | - | Rime model |
| `rime_stream_first` | boolean | true | - | Rime stream-first |
| `deepgram_stream_first` | boolean | true | - | Deepgram stream-first |
| `playht_user` | string | - | - | PlayHT user |
| `playht_key` | string | - | - | PlayHT key |
| `cartesia_model` | string | - | - | Cartesia model |
| `cartesia_key` | string | - | - | Cartesia key |

## AI Settings Defaults

### Regular Conversation Settings (`default_settings`)
- `frequency_penalty`: 0.1
- `presence_penalty`: 0.1
- `max_tokens`: 256
- `top_p`: 1
- `temperature`: 0.3
- `confidence`: 0.75
- `barge_confidence`: 0.75
- `max_tries`: 3

### Post-Processing Settings (`default_post_settings`)
- `frequency_penalty`: 0.0
- `presence_penalty`: 0.0
- `max_tokens`: 256
- `top_p`: 1
- `temperature`: 0.0
- `confidence`: 0.75
- `barge_confidence`: 0.0
- `max_tries`: 10

## Global Module Defaults

- **Default AI Model**: gpt-4o
- **Default ASR Engine**: gcloud_speech_v2_async
- **Default TTS Engine**: gcloud with voice "en-US-Neural2-J"
- **Default Language**: en-US
- **Billing Tick Size**: 10ms
- **Max Include Bytes**: 65536 (64KB)
- **Max Post Bytes**: 32768 (32KB)
- **Conversation Consolidation**: 3500 tokens

## Notes

1. **Generic Parameter Storage**: Any parameter not specifically handled by the module is stored as a string in the event headers and can be accessed by custom code.

2. **Type Conversion**: The module is flexible with types - numbers and booleans can be passed as their native JSON types or as strings, and the module will convert them appropriately.

3. **Validation**: Most numeric parameters have range validation. Model names are validated against allowed lists. Some parameters are only available in DEVELOPER_MODE.

4. **Parameter Access**: All parameters are accessible through `switch_event_get_header(app->params, "parameter_name")` which always returns a string value.

5. **Special Parameters**: Some parameters like `debug`, `acknowledge_interruptions`, and `interrupt_on_noise` accept multiple types for different behaviors.

6. **Direction-based Defaults**: Some parameters have different defaults based on call direction (inbound vs outbound), such as `attention_timeout`.

## DEVELOPER_MODE Only Parameters

These parameters are only available when the module is compiled with DEVELOPER_MODE enabled (non-zero):

| Parameter | Type | Default | Range/Values | Description |
|-----------|------|---------|--------------|-------------|
| `speech_timeout` | int | 60000ms | 0-600000ms | Total speech timeout |
| `verbose_logs` | boolean | false | - | Enhanced logging and full conversation JSON export |
| `azure_gpt` | boolean | false | - | Enable Azure GPT (sets both azure_gpt4o_mini and azure_gpt4) |
| `azure_gpt4o_mini` | boolean | false | - | Use Azure GPT-4o mini |
| `azure_gpt4` | boolean | false | - | Use Azure GPT-4 |
| `developer_prompt` | string | - | - | Developer system prompt override |
| `convo` | JSON | - | - | Pre-loaded conversation history |
| `engine` | string | gcloud | - | TTS engine selection (normally determined by voice prefix) |

### Special DEVELOPER_MODE Behaviors

1. **Accounting**: When DEVELOPER_MODE is enabled, accounting is automatically turned on.
2. **Assistant Prompt Processing**: Special prefixes are processed:
   - `"Generate: "` - AI generates the string without interpretation
   - `"RAW: "` - Uses raw prompt without template processing (disables cache)
3. **Debug Level**: In translate_transcribe module, debug_level is forced to 0 when DEVELOPER_MODE is disabled.
4. **AI Model Selection**: The `ai_model` parameter accepts any model name in DEVELOPER_MODE, but is restricted to specific models in production.