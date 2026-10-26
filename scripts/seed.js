// Populates sample data: an admin, a few owners + pets, a few caregivers,
// the services catalog, some bookings, and matching Mongo reviews.
// Usage: npm run db:seed  (run AFTER npm run db:init)
require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');

async function main() {
  const pool = await mysql.createPool({
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  });

  const passwordHash = await bcrypt.hash('password123', 10);

  console.log('Seeding users...');
  async function insertUser(name, email, role, phone) {
    const [res] = await pool.execute(
      'INSERT INTO users (name, email, password_hash, role, phone) VALUES (?, ?, ?, ?, ?)',
      [name, email, passwordHash, role, phone]
    );
    return res.insertId;
  }

  const adminId = await insertUser('Admin User', 'admin@petcare.test', 'admin', '9000000000');

  const owner1 = await insertUser('Kshitij Prabhu', 'kshitij@petcare.test', 'owner', '9000000001');
  await pool.execute('INSERT INTO pet_owners (owner_id, address) VALUES (?, ?)', [owner1, 'Bangalore, India']);

  const owner2 = await insertUser('Ashwin Venkatesh', 'ashwin@petcare.test', 'owner', '9000000002');
  await pool.execute('INSERT INTO pet_owners (owner_id, address) VALUES (?, ?)', [owner2, 'Bangalore, India']);

  const cg1 = await insertUser('Priya Nair', 'priya.cg@petcare.test', 'caregiver', '9000000003');
  await pool.execute(
    'INSERT INTO caregivers (caregiver_id, specialization, experience_years, bio) VALUES (?, ?, ?, ?)',
    [cg1, 'Dog grooming & walking', 4, 'Loves big dogs, certified pet groomer.']
  );

  const cg2 = await insertUser('Rahul Mehta', 'rahul.cg@petcare.test', 'caregiver', '9000000004');
  await pool.execute(
    'INSERT INTO caregivers (caregiver_id, specialization, experience_years, bio) VALUES (?, ?, ?, ?)',
    [cg2, 'Cat sitting & boarding', 6, 'Runs an overnight boarding space for cats.']
  );

  console.log('Seeding pets...');
  const [petRes1] = await pool.execute(
    'INSERT INTO pets (name, species, breed, age, gender, owner_id) VALUES (?, ?, ?, ?, ?, ?)',
    ['Bruno', 'Dog', 'Labrador', 3, 'male', owner1]
  );
  const [petRes2] = await pool.execute(
    'INSERT INTO pets (name, species, breed, age, gender, owner_id) VALUES (?, ?, ?, ?, ?, ?)',
    ['Whiskers', 'Cat', 'Persian', 2, 'female', owner2]
  );

  console.log('Seeding services...');
  const services = [
    ['Dog Grooming', 'Full bath, trim and nail clipping for dogs of all sizes.', 799, 60],
    ['Dog Walking', '30-minute neighbourhood walk, twice a day available.', 299, 30],
    ['Cat Sitting', 'In-home cat sitting while you are away for the day.', 499, 120],
    ['Overnight Boarding', 'Overnight boarding with feeding and playtime included.', 1299, 720],
    ['Vet Home Visit', 'Routine vet check-up at your home.', 999, 45],
  ];
  const serviceIds = [];
  for (const [name, desc, price, dur] of services) {
    const [res] = await pool.execute(
      'INSERT INTO services (service_name, description, base_price, duration_minutes) VALUES (?, ?, ?, ?)',
      [name, desc, price, dur]
    );
    serviceIds.push(res.insertId);
  }

  console.log('Seeding bookings via sp_create_booking...');
  const conn = await pool.getConnection();
  const [[b1]] = await (async () => {
    await conn.query('CALL sp_create_booking(?, ?, ?, ?, ?, ?, ?, @bid)', [
      petRes1.insertId, serviceIds[0], cg1, '2026-11-02', '10:00:00', 799, 'upi',
    ]);
    return conn.query('SELECT @bid AS booking_id');
  })();

  await conn.query('CALL sp_create_booking(?, ?, ?, ?, ?, ?, ?, @bid2)', [
    petRes2.insertId, serviceIds[3], cg2, '2026-11-05', '18:00:00', 1299, 'card',
  ]);
  const [[b2]] = await conn.query('SELECT @bid2 AS booking_id');

  // Mark the first booking completed to demonstrate the trigger + reviews flow
  await conn.query('UPDATE bookings SET status = ? WHERE booking_id = ?', ['completed', b1.booking_id]);

  conn.release();

  console.log('Seeding MongoDB reviews...');
  const mongoClient = new MongoClient(process.env.MONGODB_URI);
  await mongoClient.connect();
  const db = mongoClient.db(process.env.MONGODB_DB);
  await db.collection('reviews').insertMany([
    {
      booking_id: b1.booking_id,
      owner_id: owner1,
      caregiver_id: cg1,
      pet_id: petRes1.insertId,
      rating: 5,
      comment: 'Bruno came back so clean and happy. Priya was fantastic!',
      photos: [],
      created_at: new Date(),
    },
  ]);
  await mongoClient.close();

  console.log('Seed complete.');
  console.log('Login as: admin@petcare.test / kshitij@petcare.test / priya.cg@petcare.test (password: password123)');
  await pool.end();
}

main().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
