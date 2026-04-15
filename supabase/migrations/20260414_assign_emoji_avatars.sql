-- Assign a random emoji avatar to every user who doesn't have one yet.
-- Safe to re-run: the WHERE clause skips users that already have an avatar.

UPDATE users
SET avatar_url = (ARRAY[
  '🌭','🍔','🍕','🌮','🥩','🍗','🥓','🧆','🌯','🍱',
  '🦁','🐯','🦊','🦝','🐺','🐸','🦈','🦅','🦉','🐉',
  '🦄','🐙','🦑','🦋','🐻','🦖','🐊','🦩','🐆','🦓'
])[floor(random() * 30 + 1)::int]
WHERE avatar_url IS NULL;
