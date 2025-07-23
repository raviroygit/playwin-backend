const mongoose = require('mongoose');
const { generateGameId } = require('../models/user.model');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/playwin', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const userSchema = new mongoose.Schema({
  fullName: String,
  email: String,
  phone: String,
  gameId: String,
  password: String,
  role: String,
  status: String,
  assignedAgent: mongoose.Schema.Types.ObjectId,
  createdBy: mongoose.Schema.Types.ObjectId,
  mustChangePassword: Boolean,
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function migrateGameIds() {
  try {
    console.log('Starting gameId migration...');
    
    // Find all users without gameId
    const usersWithoutGameId = await User.find({ gameId: { $exists: false } });
    console.log(`Found ${usersWithoutGameId.length} users without gameId`);
    
    for (const user of usersWithoutGameId) {
      try {
        // Generate gameId
        const gameId = generateGameId(user.fullName, user.phone);
        
        // Check if gameId already exists
        const existingUser = await User.findOne({ gameId });
        if (existingUser) {
          console.log(`GameId ${gameId} already exists for user ${user.email}. Skipping...`);
          continue;
        }
        
        // Update user with gameId
        await User.findByIdAndUpdate(user._id, { gameId });
        console.log(`Updated user ${user.email} with gameId: ${gameId}`);
      } catch (error) {
        console.error(`Error updating user ${user.email}:`, error.message);
      }
    }
    
    console.log('GameId migration completed!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateGameIds();
}

module.exports = { migrateGameIds }; 