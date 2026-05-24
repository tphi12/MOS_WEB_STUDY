import { MongoClient, type Collection, type Db } from "mongodb";
import type { ExamAttempt, ExamBlueprint, Question, User } from "./types.js";

const uri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017";
const dbName = process.env.MONGODB_DB ?? "mos_web_study";

let client: MongoClient | undefined;
let db: Db | undefined;

export type Collections = {
  users: Collection<User>;
  questions: Collection<Question>;
  blueprints: Collection<ExamBlueprint>;
  attempts: Collection<ExamAttempt>;
};

export async function connectDb() {
  if (db) return db;

  client = new MongoClient(uri);
  await client.connect();
  db = client.db(dbName);

  await Promise.all([
    db.collection<User>("users").createIndex({ id: 1 }, { unique: true }),
    db.collection<Question>("questions").createIndex({ id: 1 }, { unique: true }),
    db.collection<Question>("questions").createIndex({ domain: 1, difficulty: 1 }),
    db.collection<Question>("questions").createIndex({ skillTags: 1 }),
    db.collection<ExamBlueprint>("blueprints").createIndex({ id: 1 }, { unique: true }),
    db.collection<ExamAttempt>("attempts").createIndex({ id: 1 }, { unique: true }),
    db.collection<ExamAttempt>("attempts").createIndex({ studentId: 1, submittedAt: -1 }),
  ]);

  return db;
}

export function collections(): Collections {
  if (!db) throw new Error("Database is not connected");
  return {
    users: db.collection<User>("users"),
    questions: db.collection<Question>("questions"),
    blueprints: db.collection<ExamBlueprint>("blueprints"),
    attempts: db.collection<ExamAttempt>("attempts"),
  };
}

export async function closeDb() {
  await client?.close();
  client = undefined;
  db = undefined;
}

export function withoutMongoId<T extends object>() {
  return { projection: { _id: 0 } } as const;
}
