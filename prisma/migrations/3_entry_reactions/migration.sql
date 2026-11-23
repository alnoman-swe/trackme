CREATE TABLE "entry_reactions" (
    "owner_id" INTEGER NOT NULL,
    "day" DATE NOT NULL,
    "person_id" INTEGER NOT NULL,
    "emoji" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entry_reactions_pkey" PRIMARY KEY ("owner_id","day","person_id","emoji")
);

ALTER TABLE "entry_reactions" ADD CONSTRAINT "entry_reactions_owner_id_day_fkey" FOREIGN KEY ("owner_id", "day") REFERENCES "entries"("person_id", "day") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "entry_reactions" ADD CONSTRAINT "entry_reactions_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE CASCADE;
