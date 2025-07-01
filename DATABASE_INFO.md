# SignalWire Agent Builder Database Information

## Database Connection
- **Host**: db (Docker service name)
- **Port**: 5432
- **Database**: agent_builder
- **User**: agent_builder
- **Password**: changeme

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