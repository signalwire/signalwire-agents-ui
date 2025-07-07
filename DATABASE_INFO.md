# SignalWire Agent Builder Database Information

## Database Connection
- **Host**: db (Docker service name)
- **Port**: 5432
- **Database**: agent_builder
- **User**: agent_builder
- **Password**: Set in DB_PASSWORD environment variable (default: changeme)

## Accessing Database

### From Docker
```bash
# Access PostgreSQL shell
docker-compose exec db psql -U agent_builder -d agent_builder

# Run SQL query directly
docker-compose exec db psql -U agent_builder -d agent_builder -c "YOUR SQL QUERY HERE;"
```

### Common Queries

#### Check agent configuration
```sql
SELECT id, name, config FROM agents;
```

#### Check specific config field
```sql
SELECT config->'post_prompt_config' as post_prompt_config FROM agents WHERE id='AGENT_ID';
```

#### Check call summaries
```sql
SELECT * FROM call_summaries ORDER BY created_at DESC LIMIT 10;
```

#### Check knowledge bases
```sql
SELECT id, name, document_count, total_chunks FROM knowledge_bases;
```

#### Check media files
```sql
SELECT id, original_filename, file_type, file_size, created_at 
FROM media_files 
ORDER BY created_at DESC LIMIT 10;
```

#### Check agent knowledge base attachments
```sql
SELECT a.name as agent_name, kb.name as kb_name, akb.search_config 
FROM agent_knowledge_bases akb
JOIN agents a ON a.id = akb.agent_id
JOIN knowledge_bases kb ON kb.id = akb.knowledge_base_id;
```

#### Check media usage
```sql
SELECT m.original_filename, a.name as agent_name, mu.parameter_name
FROM media_usage mu
JOIN media_files m ON m.id = mu.media_file_id
JOIN agents a ON a.id = mu.agent_id;
```

## Tables

### agents
- id (UUID)
- name (VARCHAR)
- description (TEXT)
- config (JSONB) - Contains all agent configuration
- swml_url (VARCHAR)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
- user_id (UUID) - optional
- post_prompt_enabled (BOOLEAN) - legacy
- post_prompt_mode (VARCHAR) - legacy
- post_prompt_text (TEXT) - legacy
- post_prompt_url (VARCHAR) - legacy

### call_summaries
- id (VARCHAR)
- agent_id (UUID)
- call_id (VARCHAR)
- ai_session_id (VARCHAR)
- call_start_date (BIGINT)
- call_end_date (BIGINT)
- created_at (TIMESTAMP)
- caller_id_name (VARCHAR)
- caller_id_number (VARCHAR)
- post_prompt_summary (TEXT)
- call_log (JSONB)
- swaig_log (JSONB)
- total_minutes (FLOAT)
- total_input_tokens (INTEGER)
- total_output_tokens (INTEGER)
- total_cost (FLOAT)
- raw_data (JSONB)

### knowledge_bases
- id (UUID)
- name (VARCHAR)
- description (TEXT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
- document_count (INTEGER)
- total_chunks (INTEGER)
- metadata (JSONB)

### kb_documents
- id (UUID)
- knowledge_base_id (UUID)
- filename (VARCHAR)
- content (TEXT)
- metadata (JSONB)
- created_at (TIMESTAMP)
- chunk_count (INTEGER)

### kb_embeddings
- id (UUID)
- document_id (UUID)
- chunk_index (INTEGER)
- chunk_text (TEXT)
- embedding (VECTOR)
- metadata (JSONB)

### agent_knowledge_bases
- agent_id (UUID)
- knowledge_base_id (UUID)
- created_at (TIMESTAMP)
- search_config (JSONB)

### media_files
- id (UUID)
- filename (VARCHAR)
- original_filename (VARCHAR)
- file_type (VARCHAR)
- mime_type (VARCHAR)
- category (VARCHAR)
- file_size (BIGINT)
- duration_seconds (FLOAT)
- file_path (TEXT)
- description (TEXT)
- uploaded_by (UUID)
- source_type (VARCHAR)
- external_url (TEXT)
- file_metadata (JSONB)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

### media_usage
- id (UUID)
- media_file_id (UUID)
- agent_id (UUID)
- parameter_name (VARCHAR)
- created_at (TIMESTAMP)

### tokens
- id (UUID)
- name (VARCHAR)
- token (VARCHAR)
- active (BOOLEAN)
- created_at (TIMESTAMP)
- expires_at (TIMESTAMP)
- last_used (TIMESTAMP)
- metadata (JSONB)

### settings
- id (UUID)
- key (VARCHAR)
- value (JSONB)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

### system_settings
- id (UUID)
- category (VARCHAR)
- settings (JSONB)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

### audit_logs
- id (UUID)
- user_id (UUID)
- action (VARCHAR)
- entity_type (VARCHAR)
- entity_id (VARCHAR)
- timestamp (TIMESTAMP)
- ip_address (VARCHAR)
- user_agent (TEXT)
- description (TEXT)
- metadata (JSONB)