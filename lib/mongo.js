// MongoDB connection helper for the reviews/ratings collection.
//
// Why MongoDB here and not MySQL:
// Reviews are unstructured/semi-structured (free-text comments of varying
// length, a variable-length array of photo URLs, optional tags) and are
// read far more often in aggregate (average rating per caregiver) than they
// are joined against relational data row-by-row. Modeling them in MySQL
// would mean either a rigid schema that can't hold a variable number of
// photos cleanly, or a separate photos table plus extra joins for something
// that is naturally one flexible document per review. MongoDB's document
// model fits this shape directly and its aggregation pipeline computes the
// caregiver rating rollups without a separate ETL step.
import { MongoClient } from 'mongodb';

let client;
let clientPromise;

export function getMongoClient() {
  if (!clientPromise) {
    client = new MongoClient(process.env.MONGODB_URI);
    clientPromise = client.connect();
  }
  return clientPromise;
}

export async function getDb() {
  const c = await getMongoClient();
  return c.db(process.env.MONGODB_DB);
}

export async function getReviewsCollection() {
  const db = await getDb();
  return db.collection('reviews');
}
