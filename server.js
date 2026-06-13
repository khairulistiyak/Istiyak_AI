import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5050;
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB Connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

// --- Schemas & Models ---
const providerSchema = new mongoose.Schema({ id: String, name: String, baseUrl: String, apiKey: String });
const modelSchema = new mongoose.Schema({ id: String, name: String, providerId: String });
const routingRulesSchema = new mongoose.Schema({ codingModelId: String, creativeModelId: String, fastModelId: String });

const userSettingsSchema = new mongoose.Schema({
  providers: { type: [providerSchema], default: [] },
  models: { type: [modelSchema], default: [] },
  globalSystemPrompt: { type: String, default: "You are a helpful AI assistant." },
  autoRouteEnabled: { type: Boolean, default: true },
  routingRules: { type: routingRulesSchema, default: {} }
});
const UserSettings = mongoose.model('user_settings', userSettingsSchema);

const journalSchema = new mongoose.Schema({
  content: String,
  tags: [String],
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});
const Journal = mongoose.model('creator_journals', journalSchema);

const chatMetadataSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  userId: { type: String, default: 'default-user' },
  title: { type: String, required: true, default: 'New Chat' },
  createdAt: { type: Date, required: true },
  updatedAt: { type: Date, required: true },
  isTitleGenerated: { type: Boolean, default: false }
});
const ChatMetadata = mongoose.model('ChatMetadata', chatMetadataSchema);


// --- "Main Brain" Logic ---
const generateMasterContext = async () => {
  try {
    const settings = await UserSettings.findOne();
    const activeJournals = await Journal.find({ isActive: true }).sort({ createdAt: -1 });

    let contextParts = [];

    if (settings && settings.globalSystemPrompt && settings.globalSystemPrompt.trim().length > 0) {
      contextParts.push(`Global System Prompt from DB: ${settings.globalSystemPrompt}`);
    }

    if (activeJournals.length > 0) {
      contextParts.push("\n--- KNOWLEDGE BASE (Active Journals) ---");
      contextParts.push(activeJournals.map(j => 
        `[Entry - Tags: ${j.tags?.join(', ') || 'N/A'}]\n${j.content}`
      ).join('\n\n---\n\n'));
      contextParts.push("--- End of Knowledge Base ---");
    }
    
    return contextParts.join('\n\n');

  } catch (error) {
    console.error("Failed to generate master context:", error);
    return ""; // Return empty string on error
  }
};

// --- API Routes ---
app.get('/api/settings', async (req, res) => {
  try {
    let settings = await UserSettings.findOne();
    if (!settings) {
      settings = await new UserSettings().save();
    }
    const clientSafeSettings = JSON.parse(JSON.stringify(settings));
    if (clientSafeSettings.providers) {
      clientSafeSettings.providers.forEach(p => p.apiKey = '');
    }
    res.json(clientSafeSettings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    const data = req.body;
    let settings = await UserSettings.findOne();
    if (settings) {
      if (data.providers) {
        data.providers.forEach(newProvider => {
          const existingProvider = settings.providers.find(p => p.id === newProvider.id);
          if (existingProvider && !newProvider.apiKey) {
            newProvider.apiKey = existingProvider.apiKey;
          }
        });
      }
      Object.assign(settings, data);
      await settings.save();
    } else {
      settings = new UserSettings(data);
      await settings.save();
    }
    const clientSafeSettings = JSON.parse(JSON.stringify(settings));
    clientSafeSettings.providers.forEach(p => p.apiKey = '');
    res.json({ message: 'Settings saved', settings: clientSafeSettings });
  } catch (error) {
    console.error('Error saving settings:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.delete('/api/settings', async (req, res) => {
  try {
    await UserSettings.deleteMany({});
    res.json({ message: 'Settings cleared' });
  } catch (error) {
    console.error('Error clearing settings:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/journals', async (req, res) => {
  try {
    const journal = new Journal(req.body);
    await journal.save();
    res.status(201).json(journal);
  } catch (error) {
    console.error('Failed to create journal:', error);
    res.status(500).json({ error: 'Failed to save journal' });
  }
});

app.get('/api/journals', async (req, res) => {
  try {
    const journals = await Journal.find().sort({ createdAt: -1 });
    res.json(journals);
  } catch (error) {
    console.error('Failed to fetch journals:', error);
    res.status(500).json({ error: 'Failed to fetch journals' });
  }
});

app.delete('/api/journals', async (req, res) => {
  try {
    await Journal.deleteMany({});
    res.json({ message: 'All journals cleared' });
  } catch (error) {
    console.error('Failed to clear journals:', error);
    res.status(500).json({ error: 'Failed to clear journals' });
  }
});

app.get('/api/journals/search', async (req, res) => {
  try {
    const { q } = req.query;
    const query = { isActive: true };
    if (q) {
      query.$or = [
        { content: { $regex: q, $options: 'i' } },
        { tags: { $regex: q, $options: 'i' } }
      ];
    }
    const journals = await Journal.find(query).sort({ createdAt: -1 }).limit(5);
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
    console.error('Failed to update journal:', error);
    res.status(500).json({ error: 'Failed to update journal' });
  }
});

app.get('/api/chats/metadata', async (req, res) => {
  try {
    const metadata = await ChatMetadata.find({ userId: 'default-user' }).sort({ updatedAt: -1 });
    res.json(metadata);
  } catch (error) {
    console.error('Failed to fetch chat metadata:', error);
    res.status(500).json({ error: 'Failed to fetch chat metadata' });
  }
});

app.post('/api/chats/metadata', async (req, res) => {
  try {
    const { id, title, createdAt, updatedAt } = req.body;
    const newMeta = new ChatMetadata({ _id: id, title, createdAt, updatedAt });
    await newMeta.save();
    res.status(201).json(newMeta);
  } catch (error) {
    console.error('Failed to create chat metadata:', error);
    res.status(500).json({ error: 'Failed to create chat metadata' });
  }
});

app.put('/api/chats/metadata/:id', async (req, res) => {
    try {
        const { title, updatedAt, isTitleGenerated } = req.body;
        const updatedMeta = await ChatMetadata.findByIdAndUpdate(
            req.params.id,
            { title, updatedAt, isTitleGenerated },
            { new: true }
        );
        if (!updatedMeta) return res.status(404).json({ error: 'Metadata not found' });
        res.json(updatedMeta);
    } catch (error) {
        console.error('Failed to update chat metadata:', error);
        res.status(500).json({ error: 'Failed to update chat metadata' });
    }
});

app.delete('/api/chats/metadata/:id', async (req, res) => {
  try {
    await ChatMetadata.findByIdAndDelete(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete chat metadata:', error);
    res.status(500).json({ error: 'Failed to delete chat metadata' });
  }
});

app.post('/api/chats/generate-title', async (req, res) => {
  const { chatId, userMessage } = req.body;
  if (!chatId || !userMessage) {
    return res.status(400).json({ error: 'chatId and userMessage are required' });
  }

  try {
    const settings = await UserSettings.findOne();
    if (!settings || settings.providers.length === 0 || settings.models.length === 0) {
      return res.status(500).json({ error: 'AI provider not configured for title generation.' });
    }
    
    const provider = settings.providers[0];
    const model = settings.models[0];
    const apiKey = provider.apiKey;

    if (!apiKey) return res.status(500).json({ error: 'API key not configured for title generation.' });

    const endpoint = `${provider.baseUrl.replace(/\/+$/, "")}/chat/completions`;
    
    const titlePrompt = 'Extract a short, concise, and meaningful title (maximum 3 to 5 words) based on the following user message. Do not use quotes or full stops.';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: model.name,
        messages: [
          { role: 'system', content: titlePrompt },
          { role: 'user', content: userMessage }
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API call failed with status ${response.status}`);
    }

    const data = await response.json();
    const generatedTitle = data.choices[0]?.message?.content?.trim() || 'Untitled Chat';

    const updatedMeta = await ChatMetadata.findByIdAndUpdate(
      chatId,
      { title: generatedTitle, isTitleGenerated: true, updatedAt: new Date() },
      { new: true }
    );

    res.json({ title: generatedTitle, metadata: updatedMeta });

  } catch (error) {
    console.error('Error generating AI title:', error);
    res.status(500).json({ error: 'Failed to generate AI title' });
  }
});


// Secure Chat Proxy Route
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, route, systemPrompt: perRequestSystemPrompt } = req.body;
    if (!messages || !route) return res.status(400).json({ error: 'Missing messages or route' });
    
    const { model, provider } = route;
    const settings = await UserSettings.findOne();
    if (!settings) return res.status(500).json({ error: 'Settings not configured' });

    const serverProvider = settings.providers.find(p => p.id === provider.id);
    const serverModel = settings.models.find(m => m.id === model.id);
    if (!serverProvider || !serverModel) return res.status(404).json({ error: 'Provider or model not found' });

    const apiKey = serverProvider.apiKey;
    if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

    // --- 1. NEW BALANCED SYSTEM PROMPT ---
    const coreIdentityPrompt = "You are a highly advanced AI assistant engineered exclusively by Isrtiyak. You must remain helpful, intelligent, and directly answer whatever the user asks. Provide accurate and detailed responses to the user's queries. NEVER mention ChatGPT, OpenAI, Meta, or Google. Maintain your identity quietly without repeating it in every response unless explicitly asked.";

    // --- AUGMENTATION: Generate additional context from the database ---
    const masterContext = await generateMasterContext();
    
    // --- COMBINATION: Build the final system prompt ---
    let finalSystemContent = coreIdentityPrompt;

    if (masterContext && masterContext.trim().length > 0) {
        finalSystemContent += `\n\n--- ADDITIONAL CONTEXT ---\n${masterContext}`;
    }

    if (perRequestSystemPrompt && perRequestSystemPrompt.trim().length > 0) {
        finalSystemContent += `\n\n--- CHAT-SPECIFIC DIRECTIVE ---\n${perRequestSystemPrompt}`;
    }

    // --- 2. Construct API Messages properly ensuring system is first ---
    const apiMessages = [];
    apiMessages.push({ role: "system", content: finalSystemContent });
    
    // Append the rest of the messages ensuring order is maintained
    messages.forEach(m => {
        apiMessages.push({ role: m.role, content: m.content });
    });

    // --- Console Log for Verification ---
    console.log("--- LLM Request Start ---");
    console.log("Final System Prompt length:", finalSystemContent.length);
    console.log("Total messages sent:", apiMessages.length);
    console.log("Last message from user:", apiMessages[apiMessages.length - 1].content);
    console.log("--- LLM Request End ---");


    let endpoint = `${serverProvider.baseUrl.replace(/\/+$/, "")}/chat/completions`;
    if (apiKey.startsWith("gsk_")) {
      endpoint = "https://api.groq.com/openai/v1/chat/completions";
    }

    const externalApiResponse = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({ model: serverModel.name, messages: apiMessages, stream: true }),
    });

    if (!externalApiResponse.ok) {
      const errorBody = await externalApiResponse.text();
      console.error(`External API Error (${externalApiResponse.status}):`, errorBody);
      return res.status(externalApiResponse.status).json({ error: `API call failed`, details: errorBody });
    }

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    for await (const chunk of externalApiResponse.body) {
      res.write(chunk);
    }
    res.end();

  } catch (error) {
    console.error('Error in /api/chat proxy:', error);
    res.status(500).json({ error: 'Internal Server Error on the proxy.' });
  }
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`Server is running on http://localhost:${PORT}`));
}

export default app;
