import mongoose from 'mongoose';
import type { IndexDescription } from 'mongodb';
import { Student } from './models/education.js';

async function ensureStudentIndexes(): Promise<void> {
  let indexes: IndexDescription[];
  try {
    indexes = await Student.collection.listIndexes().toArray();
  } catch (error) {
    if (typeof error !== 'object' || error === null || !('code' in error) || error.code !== 26) throw error;
    indexes = [];
  }

  const indexIsCorrect = (name: string, field: 'customerId' | 'clientId', bsonType: 'objectId' | 'string') => indexes.some((index) =>
    index.name === name
    && index.unique === true
    && (index.partialFilterExpression as Record<string, { $type?: string }> | undefined)?.[field]?.$type === bsonType,
  );
  const ensureIndex = async (field: 'customerId' | 'clientId', bsonType: 'objectId' | 'string') => {
    const name = `${field}_1`;
    if (indexIsCorrect(name, field, bsonType)) return;
    for (const index of indexes) {
      if (index.name && index.name !== '_id_' && field in index.key) await Student.collection.dropIndex(index.name);
    }
    await Student.collection.createIndex({ [field]: 1 }, {
      name,
      unique: true,
      partialFilterExpression: { [field]: { $type: bsonType } },
    });
    indexes = await Student.collection.listIndexes().toArray();
  };

  await ensureIndex('customerId', 'objectId');
  await ensureIndex('clientId', 'string');
}

let connecting: Promise<void> | null = null;

/**
 * Connects once per process and reuses the connection afterwards. On serverless
 * platforms (Vercel) warm invocations share the same process, so later requests
 * skip the handshake. A failed attempt is forgotten so the next request retries.
 */
export async function connectDatabase(uri: string): Promise<void> {
  if (mongoose.connection.readyState === 1) return;
  connecting ??= (async () => {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
    await ensureStudentIndexes();
  })().catch((error: unknown) => {
    connecting = null;
    throw error;
  });
  await connecting;
}

export async function disconnectDatabase(): Promise<void> {
  connecting = null;
  await mongoose.disconnect();
}
