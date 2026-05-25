-- 设备 ID 隔离：给每条记录打上匿名用户标识
ALTER TABLE "divinations" ADD COLUMN "user_id" varchar(64);

-- 加索引：按用户查心境墙 / 历史记录
CREATE INDEX "idx_user_id_saved_at"   ON "divinations" ("user_id", "saved_at"   DESC);
CREATE INDEX "idx_user_id_created_at" ON "divinations" ("user_id", "created_at" DESC);
