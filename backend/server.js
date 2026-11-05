const app = require('./src/app');
const dotenv = require('dotenv');
const connectDB = require('./src/config/db');
const bcrypt = require('bcrypt');
const User = require('./src/models/User');

dotenv.config();

const PORT = process.env.PORT || 5000;

const seedDemoManager = async () => {
  const isDevelopment = process.env.NODE_ENV === 'development'
    || process.env.npm_lifecycle_event === 'dev';
  if (!isDevelopment) return;

  const email = 'manager@risaala.com';
  const existingManager = await User.findOne({ email });
  if (existingManager) return;

  await User.create({
    name: 'Abdiqani Sh. Ibrahim',
    email,
    password: await bcrypt.hash('manager123', 10),
    role: 'MANAGER',
    status: 'ACTIVE'
  });
  console.log('Development demo manager created: manager@risaala.com');
};

connectDB().then(async () => {
  await seedDemoManager();
  app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
  });
}).catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
