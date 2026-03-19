const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongod;
let inMemoryUri;

// Connect to the in-memory database before running tests
beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  inMemoryUri = mongod.getUri();
  await mongoose.connect(inMemoryUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

// Clear all data between tests
afterEach(async () => {
  // Safety: only wipe if we're connected to the in-memory DB
  const currentUri = mongoose.connection.host;
  if (!inMemoryUri || !inMemoryUri.includes(currentUri)) return;

  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany();
  }
});

// Disconnect and stop mongod after all tests
afterAll(async () => {
  // Safety: only drop if connected to in-memory DB (never touch real DB)
  if (mongod) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongod.stop();
  }
});

// Global test timeout
jest.setTimeout(30000);
