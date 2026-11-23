CREATE TABLE "reactions" (
    "comment_id" INTEGER NOT NULL,
    "person_id" INTEGER NOT NULL,
    "emoji" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reactions_pkey" PRIMARY KEY ("comment_id","person_id","emoji")
);

ALTER TABLE "reactions" ADD CONSTRAINT "reactions_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE CASCADE;
