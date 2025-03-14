const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
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

// API endpoint to analyze content using Groq
app.post('/api/analyze-security', async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'No content provided for analysis'
      });
    }
    
    // Prepare the prompt for security analysis
    const prompt = `
Please perform a comprehensive security analysis on the following repository code:

${content}

Include the following in your analysis:
1. Potential security vulnerabilities
2. Code quality issues that may impact security
3. Sensitive data exposure risks
4. Dependency vulnerabilities
5. Recommendations for security improvements

Format your response in Markdown.
`;
    
    // Call Groq API
    const groqResponse = await axios.post(
      'https://api.groq.com/v1/completions',
      {
        model: 'deepseek-r1-distill-llama-70b',
        prompt: prompt,
        max_tokens: 2048,
        temperature: 0.2
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    res.json({
      success: true,
      analysis: groqResponse.data.choices[0].text
    });
    
  } catch (error) {
    console.error('Error during security analysis:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to complete security analysis'
    });
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
