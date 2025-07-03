
void default_settings(ai_settings_t *settings)
{
    settings->frequency_penalty = 0.1f;
    settings->presence_penalty = 0.1f;
    settings->max_tokens = 256;
    settings->top_p = 1;
    settings->temperature = 0.3f;
    settings->confidence = 0.75f;
    settings->barge_confidence = 0.75f;
    // not configurable
    settings->max_tries = 3;
}

void default_post_settings(ai_settings_t *settings)
{
    settings->frequency_penalty = 0.0f;
    settings->presence_penalty = 0.0f;
    settings->max_tokens = 256;
    settings->top_p = 1;
    settings->temperature = 0.0f;
    settings->confidence = 0.75f;
    settings->barge_confidence = 0.0f;
    // not configurable
    settings->max_tries = 10;
}
