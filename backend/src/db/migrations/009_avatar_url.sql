-- Аватар пользователя: только в профиле, не при регистрации
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(512) NULL;
