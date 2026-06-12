import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
app.use(cors({
  origin: '*', // Allow all origins for local development
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// Connect to MongoDB
mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB Connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

// Define Schema & Model
const userSettingsSchema = new mongoose.Schema({
  active_api_key: String,
  model_name: String
});

const UserSettings = mongoose.model('user_settings', userSettingsSchema);

// API Route to fetch settings
app.get('/api/settings', async (req, res) => {
  try {
    let settings = await UserSettings.findOne();
    
    // If no settings found, you can optionally create a default one
    if (!settings) {
      settings = new UserSettings({
        active_api_key: 'YOUR_DEFAULT_API_KEY',
        model_name: 'gpt-3.5-turbo'
      });
      await settings.save();
    }

    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// API Route to update settings
app.post('/api/settings', async (req, res) => {
  try {
    const { active_api_key, model_name } = req.body;
    let settings = await UserSettings.findOne();

    if (settings) {
      // Update existing settings
      settings.active_api_key = active_api_key;
      settings.model_name = model_name;
      await settings.save();
    } else {
      // Create new settings if none exist
      settings = new UserSettings({ active_api_key, model_name });
      await settings.save();
    }

    res.json({ message: 'Settings saved successfully', settings });
  } catch (error) {
    console.error('Error saving settings:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
