-- 把三个时间列从 timestamptz(UTC) 改为 timestamp without timezone(北京时间)
-- USING 子句把现存 UTC 值转成 Asia/Shanghai 时间后存入

ALTER TABLE divinations
  ALTER COLUMN created_at TYPE TIMESTAMP WITHOUT TIME ZONE
    USING (created_at AT TIME ZONE 'Asia/Shanghai');

ALTER TABLE divinations
  ALTER COLUMN saved_at TYPE TIMESTAMP WITHOUT TIME ZONE
    USING (saved_at AT TIME ZONE 'Asia/Shanghai');

ALTER TABLE divinations
  ALTER COLUMN answered_at TYPE TIMESTAMP WITHOUT TIME ZONE
    USING (answered_at AT TIME ZONE 'Asia/Shanghai');

-- 新记录的 created_at 默认值直接用北京时间
ALTER TABLE divinations
  ALTER COLUMN created_at SET DEFAULT (NOW() AT TIME ZONE 'Asia/Shanghai');
