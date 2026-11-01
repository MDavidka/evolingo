# evolingo
### AI provider configuration

AI chat, planning, and practice use OpenRouter's chat-completions endpoint.
Set `EVO_AI` to an OpenRouter API key in `.env.local` for development or in
server environment settings for deployment. Never commit API keys.
`EVO_AI_MODEL` optionally overrides the default `nvidia/nemotron-3.5-super-vl:free`.
`EVO_AI_FAST_MODEL`, if set, must also be an OpenRouter model ID.
