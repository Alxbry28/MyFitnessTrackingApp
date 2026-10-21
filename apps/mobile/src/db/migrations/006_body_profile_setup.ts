import type { SQLiteDatabase } from "expo-sqlite";

export async function up(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    ALTER TABLE body_profile ADD COLUMN sex TEXT CHECK (sex IN ('male','female'));
    ALTER TABLE body_profile ADD COLUMN birth_date TEXT;
    ALTER TABLE body_profile ADD COLUMN activity_level TEXT
      CHECK (activity_level IN ('sedentary','light','moderate','very','extra'));
    ALTER TABLE body_profile ADD COLUMN goal TEXT CHECK (goal IN ('cut','maintain','bulk'));
  `);
}
