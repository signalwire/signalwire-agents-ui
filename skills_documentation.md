# SignalWire Skills Documentation

This document provides detailed information about all available skills.

## api_ninjas_trivia Skill

**Class:** `ApiNinjasTriviaSkill`

**Description:** Get trivia questions from API Ninjas

### Details

Skill for getting trivia questions from API Ninjas with configurable categories.

Supports multiple instances with different tool names and category combinations.
Uses DataMap for serverless execution with dynamic enum generation.

Configuration:
- tool_name: Custom name for the generated SWAIG function
- api_key: API Ninjas API key
- categories: Array of category strings to enable

Available categories:
- artliterature: Art and Literature
- language: Language  
- sciencenature: Science and Nature
- general: General Knowledge
- fooddrink: Food and Drink
- peopleplaces: People and Places
- geography: Geography
- historyholidays: History and Holidays
- entertainment: Entertainment
- toysgames: Toys and Games
- music: Music
- mathematics: Mathematics
- religionmythology: Religion and Mythology
- sportsleisure: Sports and Leisure

Example:
    agent.add_skill("api_ninjas_trivia", {
        "tool_name": "get_science_trivia",
        "api_key": "your_api_key",
        "categories": ["sciencenature", "mathematics", "general"]
    })

**Supports Multiple Instances:** Yes


---

## datasphere Skill

**Class:** `DataSphereSkill`

**Description:** Search knowledge using SignalWire DataSphere RAG stack

### Details

SignalWire DataSphere knowledge search capability

**Supports Multiple Instances:** Yes

**Required Packages:** requests

### Parameters

#### Required Parameters

- **project_id** (`string`): Project identifier
- **document_id** (`string`): Document identifier
- **space_name** (`string`): Space name for the service
- **token** (`string`): Authentication token

#### Optional Parameters

- **no_results_message** (`string`) (default: `I couldn't find any relevant information for '{query}' in the knowledge base. Try rephrasing your question or asking about a different topic.`): Message to display when no results are found
- **pos_to_expand** (`string`) (default: `None`): None means don't include in request
- **tags** (`string`) (default: `None`): None means don't include in request
- **distance** (`number`) (default: `3.0`): Distance threshold for search results
- **count** (`integer`) (default: `1`): Number of results to return
- **tool_name** (`string`) (default: `search_knowledge`): Name of the tool/function to register
- **language** (`string`) (default: `None`): None means don't include in request
- **max_synonyms** (`string`) (default: `None`): None means don't include in request


---

## datasphere_serverless Skill

**Class:** `DataSphereServerlessSkill`

**Description:** Search knowledge using SignalWire DataSphere with serverless DataMap execution

### Details

SignalWire DataSphere knowledge search using DataMap (serverless execution)

**Supports Multiple Instances:** Yes

### Parameters

#### Required Parameters

- **project_id** (`string`): Project identifier
- **document_id** (`string`): Document identifier
- **space_name** (`string`): Space name for the service
- **token** (`string`): Authentication token

#### Optional Parameters

- **no_results_message** (`string`) (default: `I couldn't find any relevant information for '{query}' in the knowledge base. Try rephrasing your question or asking about a different topic.`): Message to display when no results are found
- **pos_to_expand** (`string`) (default: `None`): pos_to_expand parameter
- **tags** (`string`) (default: `None`): Tags to filter results
- **distance** (`number`) (default: `3.0`): Distance threshold for search results
- **count** (`integer`) (default: `1`): Number of results to return
- **tool_name** (`string`) (default: `search_knowledge`): Name of the tool/function to register
- **language** (`string`) (default: `None`): Language for query processing
- **max_synonyms** (`string`) (default: `None`): max_synonyms parameter


---

## datetime Skill

**Class:** `DateTimeSkill`

**Description:** Get current date, time, and timezone information

### Details

Provides current date, time, and timezone information

**Required Packages:** pytz

### Registered Tools

#### get_current_time

Get the current time, optionally in a specific timezone

**Parameters:**

- **timezone**: Timezone name (e.g., 'America/New_York', 'Europe/London'). Defaults to UTC.

#### get_current_date

Get the current date

**Parameters:**

- **timezone**: Timezone name for the date. Defaults to UTC.


---

## joke Skill

**Class:** `JokeSkill`

**Description:** Tell jokes using the API Ninjas joke API

### Details

Joke telling capability using API Ninjas with DataMap

### Parameters

#### Required Parameters

- **api_key** (`string`): API key for authentication

#### Optional Parameters

- **tool_name** (`string`) (default: `get_joke`): Name of the tool/function to register


---

## math Skill

**Class:** `MathSkill`

**Description:** Perform basic mathematical calculations

### Details

Provides basic mathematical calculation capabilities

### Registered Tools

#### calculate

Perform a mathematical calculation with basic operations (+, -, *, /, %, **)

**Parameters:**

- **expression**: Mathematical expression to evaluate (e.g., '2 + 3 * 4', '(10 + 5) / 3')


---

## mcp_gateway Skill

**Class:** `MCPGatewaySkill`

**Description:** Bridge MCP servers with SWAIG functions

### Details

MCP Gateway Skill - Bridge MCP servers with SWAIG functions

This skill connects SignalWire agents to MCP (Model Context Protocol) servers
through a gateway service, dynamically creating SWAIG functions for MCP tools.

**Required Packages:** requests

### Parameters

#### Required Parameters

- **auth_user** (`string`): auth_user parameter
- **auth_password** (`string`): auth_password parameter
- **gateway_url** (`string`): Gateway URL endpoint

#### Optional Parameters

- **verify_ssl** (`boolean`) (default: `True`): Whether to verify SSL certificates
- **tool_prefix** (`string`) (default: `mcp_`): tool_prefix parameter
- **request_timeout** (`integer`) (default: `30`): request_timeout parameter
- **retry_attempts** (`integer`) (default: `3`): retry_attempts parameter
- **services** (`array`) (default: `[]`): List of services to enable
- **session_timeout** (`integer`) (default: `300`): session_timeout parameter
- **auth_token** (`string`) (default: `None`): auth_token parameter

### Registered Tools

#### _mcp_gateway_hangup

Internal cleanup function for MCP sessions


---

## native_vector_search Skill

**Class:** `NativeVectorSearchSkill`

**Description:** Search document indexes using vector similarity and keyword search (local or remote)

### Details

Native vector search capability using local document indexes or remote search servers

**Supports Multiple Instances:** Yes

### Parameters

#### Optional Parameters

- **index_name** (`string`) (default: `default`): For remote searches
- **index_file** (`string`) (default: `None`): Path to index file
- **distance_threshold** (`number`) (default: `0.0`): distance_threshold parameter
- **response_prefix** (`string`) (default: ``): response_prefix parameter
- **no_results_message** (`string`) (default: `No information found for '{query}'`): Message to display when no results are found
- **tags** (`array`) (default: `[]`): Tags to filter results
- **nlp_backend** (`string`) (default: `None`): Backward compatibility
- **build_index** (`boolean`) (default: `False`): Whether to build the index
- **response_postfix** (`string`) (default: ``): response_postfix parameter
- **swaig_fields** (`object`) (default: `{}`): swaig_fields parameter
- **verbose** (`boolean`) (default: `False`): Enable verbose logging
- **remote_url** (`string`) (default: `None`): e.g., "http://localhost:8001"
- **query_nlp_backend** (`string`) (default: `nltk`): Default to fast NLTK for search
- **index_nlp_backend** (`string`) (default: `nltk`): Default to fast NLTK for indexing
- **file_types** (`array`) (default: `[]`): File types to include
- **global_tags** (`string`) (default: `None`): global_tags parameter
- **source_dir** (`string`) (default: `None`): Source directory for indexing
- **count** (`integer`) (default: `5`): Number of results to return
- **exclude_patterns** (`string`) (default: `None`): exclude_patterns parameter
- **tool_name** (`string`) (default: `search_knowledge`): Name of the tool/function to register


---

## play_background_file Skill

**Class:** `PlayBackgroundFileSkill`

**Description:** Control background file playback

### Details

Skill for playing background files (audio/video) with configurable tool names.

Supports multiple instances with different tool names and file collections.
Uses DataMap for serverless execution with dynamic enum generation.

Configuration:
- tool_name: Custom name for the generated SWAIG function
- files: Array of file objects with key, description, url, and optional wait

Example:
    agent.add_skill("play_background_file", {
        "tool_name": "play_testimonial",
        "files": [
            {
                "key": "massey",
                "description": "Customer success story from Massey Energy",
                "url": "https://example.com/massey.mp4",
                "wait": True
            }
        ]
    })

**Supports Multiple Instances:** Yes


---

## spider Skill

**Class:** `SpiderSkill`

**Description:** Fast web scraping and crawling capabilities

### Details

Fast web scraping skill optimized for speed and token efficiency.

**Supports Multiple Instances:** Yes

**Required Packages:** lxml


---

## swml_transfer Skill

**Class:** `SWMLTransferSkill`

**Description:** Transfer calls between agents based on pattern matching

### Details

Skill for transferring calls between agents using SWML with pattern matching

**Supports Multiple Instances:** Yes

### Parameters

#### Required Parameters

- **transfers** (`object`): Transfer configuration mapping

#### Optional Parameters

- **description** (`string`) (default: `Transfer call based on pattern matching`): Description of the tool/function
- **required_fields** (`object`) (default: `{}`): Fields that must be provided
- **default_post_process** (`boolean`) (default: `False`): default_post_process parameter
- **parameter_description** (`string`) (default: `The type of transfer to perform`): parameter_description parameter
- **parameter_name** (`string`) (default: `transfer_type`): parameter_name parameter
- **tool_name** (`string`) (default: `transfer_call`): Name of the tool/function to register
- **default_message** (`string`) (default: `Please specify a valid transfer type.`): default_message parameter


---

## weather_api Skill

**Class:** `WeatherApiSkill`

**Description:** Get current weather information from WeatherAPI.com

### Details

Skill for getting weather information from WeatherAPI.com.

Provides current weather data with configurable temperature units and
TTS-optimized natural language responses.

Configuration:
- tool_name: Custom name for the generated SWAIG function
- api_key: WeatherAPI.com API key
- temperature_unit: "fahrenheit" or "celsius" for temperature display

Example:
    agent.add_skill("weather_api", {
        "tool_name": "get_weather",
        "api_key": "your_weatherapi_key",
        "temperature_unit": "fahrenheit"
    })


---

## web_search Skill

**Class:** `WebSearchSkill`

**Description:** Search the web for information using Google Custom Search API

### Details

Web search capability using Google Custom Search API

**Supports Multiple Instances:** Yes

**Required Packages:** bs4, requests

### Parameters

#### Required Parameters

- **search_engine_id** (`string`): Search engine identifier
- **api_key** (`string`): API key for authentication

#### Optional Parameters

- **num_results** (`integer`) (default: `1`): Number of search results to return
- **delay** (`integer`) (default: `0`): Delay between requests in seconds
- **tool_name** (`string`) (default: `web_search`): Name of the tool/function to register
- **no_results_message** (`string`) (default: `I couldn't find any results for '{query}'. This might be due to a very specific query or temporary issues. Try rephrasing your search or asking about a different topic.`): Message to display when no results are found
- **max_content_length** (`integer`) (default: `2000`): Maximum content length to extract


---

## wikipedia_search Skill

**Class:** `WikipediaSearchSkill`

**Description:** Search Wikipedia for information about a topic and get article summaries

### Details

Skill for searching Wikipedia articles and retrieving content.

This skill uses the Wikipedia API to search for articles and retrieve
their introductory content, similar to getting a summary of a topic.

**Required Packages:** requests

### Parameters

#### Optional Parameters

- **num_results** (`integer`) (default: `1`): Ensure at least 1 result
- **no_results_message** (`string`) (default: `None`): Message to display when no results are found

### Registered Tools

#### search_wiki

Search Wikipedia for information about a topic and get article summaries

**Parameters:**

- **query**: The search term or topic to look up on Wikipedia


---

