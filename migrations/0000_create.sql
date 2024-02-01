-- Migration number: 0000 	 2024-01-31T18:44:16.988Z

-- A log containing a history of all the successful definition submissions.
CREATE TABLE defs_log (
  -- The word.
  word TEXT,

  -- The definition.
  def TEXT,

  -- The user who submitted the definition.
  author TEXT,

  -- When the definition was submitted, as a 64-bit integer number of milliseconds
  -- since the unix epoch.
  timestamp INT,

  -- The IP address of the client that made this submission.
  -- (We save this to make it easier to fight spam/abuse.)
  ip TEXT
);

CREATE INDEX log_by_time ON defs_log(timestamp, word);
CREATE INDEX log_by_word ON defs_log(word, timestamp);

-- The currently-active definitions.
CREATE TABLE defs (
  word TEXT PRIMARY KEY,
  def_id INT -- references defs_log(rowid)
);

CREATE TABLE status (
  word_of_the_day TEXT,

  -- The time of the last update to the word of the day.
  wotd_timestamp INT,

  --  The number of entries in the defs table.
  --  We maintain this separately so that we do not need to
  --  do a full table scan to count the value every time we want it.
  num_defined INT,

  total_num_words INT
);

INSERT INTO status (word_of_the_day, wotd_timestamp, num_defined, total_num_words)
VALUES ("hello", 0, 0, 270225);

--- triggers to keep status.num_defined up-to-date
CREATE TRIGGER after_def_insert
AFTER INSERT ON defs
BEGIN
    UPDATE status SET num_defined = num_defined + 1;
END;

CREATE TRIGGER after_def_delete
AFTER DELETE ON defs
BEGIN
    UPDATE status SET num_defined = num_defined - 1;
END;

-- Words that we do not want to choose as word of the day.
CREATE TABLE bad_words (
  word TEXT PRIMARY KEY
);
