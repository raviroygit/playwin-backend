const mongoose = require('mongoose');
const { CommissionSettings } = require('../models/commission.model');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/playwin', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function initCommissionSettings() {
  try {
    // Check if commission settings already exist
    const existingSettings = await CommissionSettings.findOne();
    
    if (!existingSettings) {
      // Create default commission settings
      const defaultSettings = new CommissionSettings({
        agentCommissionPercentage: 5,
        winnerPayoutPercentage: 80,
        adminFeePercentage: 15,
        minBetAmount: 10,
        maxBetAmount: 10000,
        updatedBy: 'System',
      });
      
      await defaultSettings.save();
      console.log('✅ Default commission settings created successfully');
    } else {
      console.log('✅ Commission settings already exist');
    }
    
    console.log('Current settings:', existingSettings || 'Default settings created');
  } catch (error) {
    console.error('❌ Error initializing commission settings:', error);
  } finally {
    mongoose.connection.close();
  }
}

initCommissionSettings(); 