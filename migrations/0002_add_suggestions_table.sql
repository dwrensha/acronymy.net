-- Migration number: 0002 	 2024-09-10T16:48:10.681Z

-- User-provided suggestions for words to be added to the main list.
CREATE TABLE suggestions (
  -- randomly-generated identifier
  id TEXT PRIMARY KEY,

  -- The word.
  word TEXT,

  -- The definition.
  def TEXT,

  -- The user who submitted the suggestion.
  author TEXT,

  -- When definition was submitted, as a 64-bit integer number of milliseconds
  -- since the unix epoch.
  timestamp INT,

  -- 0 means pending
  -- 1 means accepted
  -- -1 means rejected
  status INT,

  -- When a moderator accepts or rejects a suggestion, they may choose
  -- to leave a message explaining their choice.
  moderator_note Text
);
