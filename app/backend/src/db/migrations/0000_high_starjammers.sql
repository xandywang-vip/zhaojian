CREATE TABLE "divinations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic" varchar(32) NOT NULL,
	"ben_gua_name" varchar(32),
	"bian_gua_name" varchar(32),
	"dong_yao" integer,
	"yao_pos_name" varchar(8),
	"cast_trace" jsonb,
	"ai_reading" jsonb,
	"feedback" varchar(8),
	"question" text,
	"question_source" varchar(32),
	"answer" text,
	"answered_at" timestamp with time zone,
	"is_saved" boolean DEFAULT false NOT NULL,
	"saved_at" timestamp with time zone,
	"care_note" text,
	"primary_imagery_key" varchar(32),
	"display_yao_text" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_saved_at" ON "divinations" USING btree ("is_saved","saved_at");--> statement-breakpoint
CREATE INDEX "idx_created_at" ON "divinations" USING btree ("created_at");