const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));
app.use(express.static('public'));

// API endpoint to fetch content from uithub.com
app.post('/api/fetch-content', async (req, res) => {
  try {
    const { url } = req.body;
    
    // Simple validation
    if (!url || !url.startsWith('https://uithub.com/')) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid uithub URL provided' 
      });
    }
    
    // Fetch the content directly using axios
    const response = await axios.get(url, {
      timeout: 30000, // 30 second timeout
    });
    
    console.log(`uithub response size: ${JSON.stringify(response.data).length} bytes`);
    
    // Return the raw HTML content
    res.json({
      success: true,
      content: response.data
    });
    
  } catch (error) {
    console.error('Error fetching content:', error);
    
    let errorMessage = 'Failed to retrieve content';
    if (error.code === 'ECONNABORTED') {
      errorMessage = 'Request timed out';
    } else if (error.response) {
      errorMessage = `Server error: ${error.response.status}`;
    }
    
    res.status(500).json({
      success: false,
      message: errorMessage
    });
  }
});

// 1. Install the Groq SDK
// npm install --save groq-sdk

// 2. Import and initialize the SDK
const Groq = require("groq-sdk");

// 3. Initialize with your API key (from environment variables)
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const groq = new Groq(GROQ_API_KEY);

// 4. Update your security analysis endpoint
app.post('/api/analyze-security', async (req, res) => {
  console.log(`Security analysis payload size: ${JSON.stringify(req.body).length} bytes`);
  
  try {
    // Use the Groq SDK instead of direct Axios calls
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a security expert analyzing code repositories for vulnerabilities."
        },
        {
          role: "user",
          content: `Please perform a comprehensive security analysis on the following repository code:\n\n${JSON.stringify(req.body.code)}`
        }
      ],
      model: "llama-3.3-70b-versatile", // Or another appropriate model
      temperature: 0.5,
      max_completion_tokens: 1024,
      top_p: 1
    });
    
    // Extract the response
    const analysis = chatCompletion.choices[0]?.message?.content || "";
    
    // Send the response back to the client
    res.json({ analysis });
  } catch (error) {
    console.error("Error during security analysis:", error);
    res.status(500).json({ error: error.message });
  }
});

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${server.address().port}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`Port ${PORT} is busy, trying ${PORT + 1}...`);
    server.listen(PORT + 1);
  } else {
    console.error(err);
  }
});
