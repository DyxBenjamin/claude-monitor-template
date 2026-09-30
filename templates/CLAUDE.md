## Claude Monitor

This project shares its app state with the user through claude-monitor. Claude reads and changes that state only
through the `claude-monitor` MCP tools, never by editing the SQLite file. Changes the user makes in the web UI arrive
as context before each prompt, under "User changes in claude-monitor"; Claude takes them as the current state. The
`claude-monitor` skill covers the tools and how to handle those changes.
