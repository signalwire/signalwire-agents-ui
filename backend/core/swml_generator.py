"""SWML document generation using SignalWire Agents SDK."""
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import logging
import os

from signalwire_agents import AgentBase
from signalwire_agents.skills.registry import skill_registry
from .config import settings
from .security import create_skill_jwt_token

logger = logging.getLogger(__name__)


def generate_swml(agent_config: Dict[str, Any], agent_id: str, db_session=None) -> Dict[str, Any]:
    """Generate a SWML document from agent configuration using the SDK.
    
    Args:
        agent_config: Agent configuration dict
        agent_id: Agent ID string
        db_session: Optional database session for env var resolution
    """
    
    # Create an ephemeral agent with the name and recording settings
    agent_name = agent_config.get('name', 'Agent')
    
    # Extract recording configuration
    record_call = agent_config.get('record_call', False)
    record_format = agent_config.get('record_format', 'mp4')
    record_stereo = agent_config.get('record_stereo', True)
    
    agent = AgentBase(
        name=agent_name,
        record_call=record_call,
        record_format=record_format,
        record_stereo=record_stereo
    )
    
    # Debug logging to verify recording settings
    logger.info(f"Agent created with record_call={record_call}, format={record_format}, stereo={record_stereo}")
    
    # Configure voice and language
    voice = agent_config.get('voice', 'nova')
    engine = agent_config.get('engine', 'elevenlabs')
    language = agent_config.get('language', 'en-US')
    model = agent_config.get('model')
    
    # Don't modify the voice - engine is already stored separately
    
    # Determine proper language name
    lang_names = {
        'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German',
        'pt': 'Portuguese', 'it': 'Italian', 'ja': 'Japanese', 'ko': 'Korean',
        'zh': 'Chinese', 'ru': 'Russian', 'hi': 'Hindi', 'nl': 'Dutch'
    }
    base_lang = language.split('-')[0] if language != 'multi' else 'multi'
    proper_name = lang_names.get(base_lang, 'English')
    
    # Add language configuration
    # The SDK expects individual parameters, not a dict
    if engine == 'rime' and model:
        agent.add_language(proper_name, language, voice, engine=engine, model=model)
    else:
        agent.add_language(proper_name, language, voice, engine=engine)
    
    # Set parameters
    default_params = {
        'end_of_speech_timeout': 700,
        'attention_timeout': 5000
    }
    params = {**default_params, **agent_config.get('params', {})}
    
    # Set parameters individually to avoid issues
    for key, value in params.items():
        agent.set_param(key, value)
    
    # Configure prompt sections
    prompt_sections = agent_config.get('prompt_sections', [])
    for section in prompt_sections:
        title = section.get('title', 'Section')
        body = section.get('body', '')
        bullets = section.get('bullets', [])
        
        # Use the correct method: prompt_add_section
        agent.prompt_add_section(
            title=title,
            body=body,
            bullets=bullets if bullets else None
        )
    
    # Add hints if provided (legacy support)
    if hints := agent_config.get('hints'):
        agent.add_hints(hints)
    
    # Add new hint configurations
    if simple_hints := agent_config.get('simple_hints'):
        agent.add_hints(simple_hints)
    
    if pattern_hints := agent_config.get('pattern_hints'):
        for pattern_hint in pattern_hints:
            agent.add_pattern_hint(
                hint=pattern_hint.get('hint', ''),
                pattern=pattern_hint.get('pattern', ''),
                replace=pattern_hint.get('replace', ''),
                ignore_case=pattern_hint.get('ignore_case', False)
            )
    
    # Add pronunciations
    if pronunciations := agent_config.get('pronunciations'):
        for pronunciation in pronunciations:
            agent.add_pronunciation(
                replace=pronunciation.get('replace', ''),
                with_text=pronunciation.get('with', ''),
                ignore_case=pronunciation.get('ignore_case', False)
            )
    
    # Set global data
    if global_data := agent_config.get('global_data'):
        agent.set_global_data(global_data)
    
    # Enable native functions
    if native_functions := agent_config.get('native_functions'):
        agent.set_native_functions(native_functions)
    
    # Set internal fillers for native functions
    if internal_fillers := agent_config.get('internal_fillers'):
        agent.set_internal_fillers(internal_fillers)
    
    # Configure contexts and steps
    if contexts_steps_config := agent_config.get('contexts_steps_config'):
        if contexts := contexts_steps_config.get('contexts'):
            # Initialize contexts
            contexts_obj = agent.define_contexts()
            
            for context in contexts:
                context_name = context.get('name', 'default')
                context_obj = contexts_obj.add_context(context_name)
                
                # Set isolated if specified
                if context.get('isolated', False):
                    context_obj.set_isolated(True)
                
                # Add context sections
                for section in context.get('sections', []):
                    context_obj.add_section(
                        title=section.get('title', ''),
                        content=section.get('content', ''),
                        bullets=section.get('bullets')
                    )
                
                # Add enter fillers
                if enter_fillers := context.get('enter_filler'):
                    for lang, fillers in enter_fillers.items():
                        context_obj.add_enter_filler(lang, fillers)
                
                # Add steps
                for step in context.get('steps', []):
                    step_name = step.get('name', '')
                    step_obj = context_obj.add_step(step_name)
                    
                    # Add step sections
                    for section in step.get('sections', []):
                        step_obj.add_section(
                            title=section.get('title', ''),
                            content=section.get('content', ''),
                            bullets=section.get('bullets')
                        )
                    
                    # Set step criteria
                    if criteria := step.get('step_criteria'):
                        step_obj.set_step_criteria(criteria)
                    
                    # Set valid steps
                    if valid_steps := step.get('valid_steps'):
                        step_obj.set_valid_steps(valid_steps)
                    
                    # Set valid contexts
                    if valid_contexts := step.get('valid_contexts'):
                        step_obj.set_valid_contexts(valid_contexts)
                    
                    # Set function restrictions
                    if restricted_functions := step.get('restricted_functions'):
                        if 'none' in restricted_functions:
                            step_obj.set_functions('none')
                        else:
                            step_obj.set_functions(restricted_functions)
    
    # Configure SWAIG webhook URL
    # The SDK will handle auth via basic auth in the SWML
    agent.set_web_hook_url(f"https://{settings.hostname}:{settings.port}/api/swaig/function")
    
    # Add skills using the proper SDK method
    if skills := agent_config.get('skills'):
        # Import env resolver if we have a db session
        env_resolver = None
        if db_session:
            from .env_var_resolver import EnvVarResolver
            env_resolver = EnvVarResolver(db_session)
        
        for skill_config in skills:
            skill_name = skill_config.get('name')
            skill_params = skill_config.get('params', {})
            
            # Resolve environment variables if we have a resolver
            if env_resolver:
                try:
                    skill_class = skill_registry.get_skill_class(skill_name)
                    if hasattr(skill_class, 'get_parameter_schema'):
                        param_schema = skill_class.get_parameter_schema()
                        skill_params = env_resolver.resolve_skill_params(skill_params, param_schema)
                        logger.info(f"Resolved env vars for skill {skill_name}")
                except Exception as e:
                    logger.warning(f"Could not resolve env vars for skill {skill_name}: {e}")
            else:
                # Fall back to old method if no db session
                if skill_name == 'web_search':
                    if not skill_params.get('api_key'):
                        api_key = os.getenv('GOOGLE_API_KEY')
                        if api_key:
                            skill_params['api_key'] = api_key
                            logger.info("Using GOOGLE_API_KEY from environment")
                    if not skill_params.get('search_engine_id'):
                        search_engine_id = os.getenv('GOOGLE_SEARCH_ENGINE_ID')
                        if search_engine_id:
                            skill_params['search_engine_id'] = search_engine_id
                            logger.info("Using GOOGLE_SEARCH_ENGINE_ID from environment")
                
                elif skill_name == 'weather_api':
                    if not skill_params.get('api_key'):
                        api_key = os.getenv('OPENWEATHERMAP_API_KEY')
                        if api_key:
                            skill_params['api_key'] = api_key
                            logger.info("Using OPENWEATHERMAP_API_KEY from environment")
            
            try:
                # Use the SDK's proper add_skill method
                # The SDK will handle skill loading and configuration
                agent.add_skill(skill_name, skill_params)
                logger.info(f"Successfully added skill: {skill_name}")
                
            except Exception as e:
                # Log the error but continue - some skills might not be available
                logger.warning(f"Could not add skill {skill_name}: {e}")
                # Don't fall back to manual registration - let the SDK handle it
    
    # Configure post-prompt based on agent config
    post_prompt_config = agent_config.get('post_prompt_config', {})
    
    logger.info(f"Post-prompt config: {post_prompt_config}")
    
    # Check if post-prompt is enabled (either new format or legacy)
    post_prompt_enabled = (
        post_prompt_config.get('enabled', False) or 
        agent_config.get('post_prompt_enabled', False) or
        bool(agent_config.get('post_prompt'))
    )
    
    logger.info(f"Post-prompt enabled: {post_prompt_enabled}")
    
    if post_prompt_enabled:
        # Get post-prompt text
        post_prompt_text = (
            post_prompt_config.get('text') or
            agent_config.get('post_prompt_text') or
            agent_config.get('post_prompt') or
            'Summarize the conversation including key points and action items'
        )
        agent.set_post_prompt(post_prompt_text)
        
        # Determine mode and URL
        post_prompt_mode = post_prompt_config.get('mode', 'builtin')
        if post_prompt_mode == 'custom' and post_prompt_config.get('custom_url'):
            agent.set_post_prompt_url(post_prompt_config['custom_url'])
        elif agent_config.get('post_prompt_url'):  # Legacy support
            agent.set_post_prompt_url(agent_config['post_prompt_url'])
        else:
            # Use built-in handler
            agent.set_post_prompt_url(f"https://{settings.hostname}:{settings.port}/api/post-prompt/receive")
            
            # Only add auth token to global_data when using built-in handler
            auth_token = create_skill_jwt_token(agent_id, "general", {})
            existing_global_data = agent_config.get('global_data', {})
            global_data_with_auth = {**existing_global_data, 'auth_token': auth_token}
            agent.set_global_data(global_data_with_auth)
    
    # Get the SWML document from the agent
    try:
        # The agent needs to be prepared for rendering
        # This happens automatically when serving, but we need to trigger it manually
        agent._render_swml()
        
        # Get the rendered SWML as JSON string
        swml_json = agent.render_document()
        
        # Parse the JSON string to a dictionary
        import json
        swml_doc = json.loads(swml_json)
        
        # Log the SWML structure to debug recording issue
        logger.info(f"SWML sections: {list(swml_doc.get('sections', {}).get('main', []))}")
        for i, section in enumerate(swml_doc.get('sections', {}).get('main', [])):
            logger.info(f"Section {i}: {list(section.keys())}")
        
        # Override webhook URLs in SWAIG functions to use our endpoint
        if 'sections' in swml_doc and 'main' in swml_doc['sections']:
            for section in swml_doc['sections']['main']:
                if 'ai' in section and 'SWAIG' in section['ai'] and 'functions' in section['ai']['SWAIG']:
                    for function in section['ai']['SWAIG']['functions']:
                        # Replace the SDK's webhook URL with our own
                        function['web_hook_url'] = f"https://{settings.hostname}:{settings.port}/api/swaig/function"
                        
                        # Add function-specific token to meta_data for backward compatibility
                        if 'meta_data' not in function:
                            function['meta_data'] = {}
                        
                        # Find the skill that provides this function
                        function_name = function.get('function', '')
                        skill_name = None
                        skill_params = {}
                        
                        # Map function to skill
                        function_to_skill = {
                            "search_web": "web_search",
                            "web_search": "web_search",
                            "get_weather": "weather",
                            "get_current_time": "datetime",
                            "get_current_date": "datetime",
                            "calculate": "math",
                            "tell_joke": "joke",
                            # Add more mappings as needed
                        }
                        
                        skill_name = function_to_skill.get(function_name)
                        if skill_name:
                            # Find skill params from agent config
                            for skill_config in agent_config.get('skills', []):
                                if skill_config.get('name') == skill_name:
                                    skill_params = skill_config.get('params', {})
                                    break
                        
                        # Create function-specific token
                        token = create_skill_jwt_token(agent_id, skill_name or "general", skill_params)
                        function['meta_data']['token'] = token
        
        # Return the modified SWML document
        return swml_doc
        
    except Exception as e:
        logger.error(f"Error generating SWML from agent: {e}")
        # Fall back to manual generation
        return generate_swml_manual(agent_config, agent_id)


def add_manual_skill_functions(agent: AgentBase, skill_name: str):
    """Manually add skill functions when dynamic loading fails."""
    
    # Define manual function mappings
    if skill_name == "datetime":
        agent.register_swaig_function(
            name="get_current_time",
            description="Get the current time, optionally in a specific timezone",
            parameters={
                "type": "object",
                "properties": {
                    "timezone": {
                        "type": "string",
                        "description": "Timezone name (e.g., 'America/New_York', 'Europe/London'). Defaults to UTC."
                    }
                }
            }
        )
        agent.register_swaig_function(
            name="get_current_date",
            description="Get the current date",
            parameters={
                "type": "object",
                "properties": {
                    "timezone": {
                        "type": "string",
                        "description": "Timezone name for the date. Defaults to UTC."
                    }
                }
            }
        )
    elif skill_name == "math":
        agent.register_swaig_function(
            name="calculate",
            description="Perform mathematical calculations",
            parameters={
                "type": "object",
                "properties": {
                    "expression": {
                        "type": "string",
                        "description": "Mathematical expression to evaluate"
                    }
                },
                "required": ["expression"]
            }
        )
    elif skill_name == "web_search":
        agent.register_swaig_function(
            name="web_search",
            description="Search the web for information",
            parameters={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search query"
                    }
                },
                "required": ["query"]
            }
        )
    elif skill_name == "weather":
        agent.register_swaig_function(
            name="get_weather",
            description="Get weather information for a location",
            parameters={
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "description": "City name or coordinates"
                    }
                },
                "required": ["location"]
            }
        )


def generate_swml_manual(agent_config: Dict[str, Any], agent_id: str) -> Dict[str, Any]:
    """Manual SWML generation as fallback."""
    
    # Build prompt sections
    prompt_content = []
    for section in agent_config.get('prompt_sections', []):
        section_obj = {
            "section": section.get('title', 'Section'),
            "content": []
        }
        
        if body := section.get('body'):
            section_obj["content"].append({
                "type": "text",
                "text": body
            })
        
        if bullets := section.get('bullets'):
            section_obj["content"].append({
                "type": "unordered_list",
                "items": bullets
            })
        
        prompt_content.append(section_obj)
    
    # Build AI configuration
    voice = agent_config.get('voice', 'nova')
    engine = agent_config.get('engine', 'elevenlabs')
    
    # Don't modify the voice - engine is already stored separately
    
    ai_config = {
        "voice": voice,
        "prompt": {
            "temperature": 0.7,
            "top_p": 0.9,
            "content": prompt_content
        }
    }
    
    # Add language configuration
    language = agent_config.get('language', 'en-US')
    lang_names = {
        'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German',
        'pt': 'Portuguese', 'it': 'Italian', 'ja': 'Japanese', 'ko': 'Korean',
        'zh': 'Chinese', 'ru': 'Russian', 'hi': 'Hindi', 'nl': 'Dutch'
    }
    base_lang = language.split('-')[0] if language != 'multi' else 'multi'
    proper_name = lang_names.get(base_lang, 'English')
    
    language_config = {
        "name": proper_name,
        "code": language,
        "engine": engine,
        "voice": voice
    }
    
    if engine == 'rime' and (model := agent_config.get('model')):
        language_config["model"] = model
    
    ai_config["languages"] = [language_config]
    
    # Add hints
    if hints := agent_config.get('hints'):
        ai_config["hints"] = hints
    
    # Add parameters
    default_params = {
        "end_of_speech_timeout": 700,
        "attention_timeout": 5000
    }
    ai_config["params"] = {**default_params, **agent_config.get('params', {})}
    
    # Build SWAIG configuration
    swaig_config = {
        "defaults": {
            "web_hook_url": f"https://{settings.hostname}:{settings.port}/api/swaig/function"
        }
    }
    
    # Add skills manually
    if skills := agent_config.get('skills'):
        functions = []
        for skill_config in skills:
            skill_name = skill_config.get('name')
            skill_params = skill_config.get('params', {})
            
            # Add functions based on skill type
            if skill_name == "datetime":
                functions.extend([
                    {
                        "function": "get_current_time",
                        "description": "Get the current time, optionally in a specific timezone",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "timezone": {
                                    "type": "string",
                                    "description": "Timezone name (e.g., 'America/New_York', 'Europe/London'). Defaults to UTC."
                                }
                            }
                        }
                    },
                    {
                        "function": "get_current_date",
                        "description": "Get the current date",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "timezone": {
                                    "type": "string",
                                    "description": "Timezone name for the date. Defaults to UTC."
                                }
                            }
                        }
                    }
                ])
            elif skill_name == "math":
                functions.append({
                    "function": "calculate",
                    "description": "Perform mathematical calculations",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "expression": {
                                "type": "string",
                                "description": "Mathematical expression to evaluate"
                            }
                        },
                        "required": ["expression"]
                    },
                    "meta_data": {"token": token}
                })
            elif skill_name == "web_search":
                functions.append({
                    "function": "web_search",
                    "description": "Search the web for information",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "query": {
                                "type": "string",
                                "description": "Search query"
                            }
                        },
                        "required": ["query"]
                    },
                    "meta_data": {"token": token}
                })
            elif skill_name == "weather":
                functions.append({
                    "function": "get_weather",
                    "description": "Get weather information for a location",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "location": {
                                "type": "string",
                                "description": "City name or coordinates"
                            }
                        },
                        "required": ["location"]
                    },
                    "meta_data": {"token": token}
                })
        
        if functions:
            swaig_config["functions"] = functions
    
    ai_config["SWAIG"] = swaig_config
    
    # Add post-prompt based on agent config
    post_prompt_config = agent_config.get('post_prompt_config', {})
    
    # Check if post-prompt is enabled (either new format or legacy)
    post_prompt_enabled = (
        post_prompt_config.get('enabled', False) or 
        agent_config.get('post_prompt_enabled', False) or
        bool(agent_config.get('post_prompt'))
    )
    
    if post_prompt_enabled:
        # Get post-prompt text
        post_prompt_text = (
            post_prompt_config.get('text') or
            agent_config.get('post_prompt_text') or
            agent_config.get('post_prompt') or
            'Summarize the conversation including key points and action items'
        )
        ai_config["post_prompt"] = post_prompt_text
        
        # Determine mode and URL
        post_prompt_mode = post_prompt_config.get('mode', 'builtin')
        if post_prompt_mode == 'custom' and post_prompt_config.get('custom_url'):
            ai_config["post_prompt_url"] = post_prompt_config['custom_url']
        elif agent_config.get('post_prompt_url'):  # Legacy support
            ai_config["post_prompt_url"] = agent_config['post_prompt_url']
        else:
            ai_config["post_prompt_url"] = f"https://{settings.hostname}:{settings.port}/api/post-prompt/receive"
    
    # Build the SWML document
    main_section = [{"answer": {}}]
    
    # Add record_call if enabled
    if agent_config.get('record_call', False):
        main_section.append({
            "record_call": {
                "format": agent_config.get('record_format', 'mp4'),
                "stereo": agent_config.get('record_stereo', True)
            }
        })
    
    main_section.append({"ai": ai_config})
    
    swml_doc = {
        "version": "1.0",
        "sections": {
            "main": main_section
        }
    }
    
    # Add global_data - only include auth token if post-prompt is enabled with built-in handler
    existing_global_data = agent_config.get('global_data', {})
    if post_prompt_enabled and post_prompt_mode == 'builtin':
        auth_token = create_skill_jwt_token(agent_id, "general", {})
        swml_doc['global_data'] = {**existing_global_data, 'auth_token': auth_token}
    elif existing_global_data:
        swml_doc['global_data'] = existing_global_data
    
    return swml_doc