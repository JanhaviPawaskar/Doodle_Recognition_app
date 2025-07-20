// GenAI backend for doodle prediction using OpenAI GPT-4 Vision
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { OpenAI } = require('openai');

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '5mb' }));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post('/genai-predict', async (req, res) => {
  const { image } = req.body;
  if (!image) return res.status(400).json({ error: 'No image provided' });
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "What is this doodle? Respond with a short guess." },
            { type: "image_url", image_url: { url: image } }
          ]
        }
      ],
      max_tokens: 50
    });
    const guess = response.choices[0].message.content;
    res.json({ guess });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`GenAI backend running on port ${PORT}`));
