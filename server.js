import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
app.use(cors()); // Allow all origins and methods by default for local development
app.use(express.json());

const PORT = process.env.PORT || 5050;
const MONGO_URI = process.env.MONGO_URI;

// Connect to MongoDB
mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB Connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

// Define Schema & Model
const providerSchema = new mongoose.Schema({
  id: String,
  name: String,
  baseUrl: String,
  apiKey: String
});

const modelSchema = new mongoose.Schema({
  id: String,
  name: String,
  providerId: String
});

const routingRulesSchema = new mongoose.Schema({
  codingModelId: String,
  creativeModelId: String,
  fastModelId: String
});

const userSettingsSchema = new mongoose.Schema({
  active_api_key: String,
  model_name: String,
  providers: { type: [providerSchema], default: [] },
  models: { type: [modelSchema], default: [] },
  globalSystemPrompt: { type: String, default: "You are a helpful AI assistant." },
  autoRouteEnabled: { type: Boolean, default: true },
  routingRules: { type: routingRulesSchema, default: {} }
});

const UserSettings = mongoose.model('user_settings', userSettingsSchema);

// Journal Schema
const journalSchema = new mongoose.Schema({
  content: String,
  tags: [String],
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

const Journal = mongoose.model('creator_journals', journalSchema);

// API Route to fetch settings
app.get('/api/settings', async (req, res) => {
  try {
    let settings = await UserSettings.findOne();
    
    if (!settings) {
      settings = new UserSettings({
        active_api_key: '',
        model_name: '',
        providers: [],
        models: [],
        globalSystemPrompt: "You are a helpful AI assistant.",
        autoRouteEnabled: true,
        routingRules: { codingModelId: null, creativeModelId: null, fastModelId: null }
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
    const data = req.body;
    let settings = await UserSettings.findOne();

    if (settings) {
      Object.assign(settings, data);
      await settings.save();
    } else {
      settings = new UserSettings(data);
      await settings.save();
    }

    res.json({ message: 'Settings saved successfully', settings });
  } catch (error) {
    console.error('Error saving settings:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.delete('/api/settings', async (req, res) => {
  try {
    const result = await UserSettings.deleteMany({});
    res.json({ message: 'Settings cleared successfully', deletedCount: result.deletedCount });
  } catch (error) {
    console.error('Error clearing settings:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// API Routes for Journals
app.post('/api/journals', async (req, res) => {
  try {
    const journal = new Journal(req.body);
    await journal.save();
    res.status(201).json(journal);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save journal' });
  }
});

app.get('/api/journals', async (req, res) => {
  try {
    const journals = await Journal.find().sort({ createdAt: -1 });
    res.json(journals);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch journals' });
  }
});

app.delete('/api/journals', async (req, res) => {
  try {
    const result = await Journal.deleteMany({});
    res.json({ message: 'All journals cleared successfully', deletedCount: result.deletedCount });
  } catch (error) {
    console.error('Failed to clear journals:', error);
    res.status(500).json({ error: 'Failed to clear journals' });
  }
});

app.get('/api/journals/search', async (req, res) => {
  try {
    const { q } = req.query;
    let query = { isActive: true }; // Only fetch active journals for RAG
    
    if (q) {
      // Basic regex search for RAG fallback. 
      // Future: Replace with Vector Search (e.g., MongoDB Atlas Vector Search)
      query.$or = [
        { content: { $regex: q, $options: 'i' } },
        { tags: { $regex: q, $options: 'i' } }
      ];
    }
    
    const journals = await Journal.find(query).sort({ createdAt: -1 }).limit(5); // limit to top 5 context chunks
    res.json(journals);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Failed to search journals' });
  }
});

app.patch('/api/journals/:id', async (req, res) => {
  try {
    const journal = await Journal.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(journal);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update journal' });
  }
});


if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

export default app;
