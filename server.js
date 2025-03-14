import express from 'express';
import axios from 'axios';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
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
        message: 'Invalid Github URL provided' 
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

// Import Google Generative AI SDK
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize with your API key (from environment variables)
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);

// Security analysis endpoint using Google Gemini
app.post('/api/analyze-security', async (req, res) => {
  console.log(`Security analysis payload size: ${JSON.stringify(req.body).length} bytes`);
  
  try {
    // Check if content exists in the request body
    if (!req.body.content) {
      return res.status(400).json({ 
        error: "No repository content provided in the request" 
      });
    }
    
    // Initialize the Gemini model
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-lite",
      generationConfig: {
        temperature: 0.2,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 2048,
      }
    });
    
    // Define security categories to check
    const securityCategories = [
      "Command injection prevention",
      "Context boundary enforcement",
      "Tool authorization controls",
      "Parameter validation",
      "Local privilege escalation checks",
      "Socket communication security",
      "Cross-tool request forgery prevention",
      "Tool response validation",
      "Command execution sandboxing",
      "Tool registration verification",
      "API endpoint security",
      "MCP server authentication",
      "JSON deserialization protections",
      "Command rate limiting",
      "Network isolation verification",
      "Localhost-only binding checks",
      "Tool capability limitations",
      "Context protocol validation",
      "Response integrity verification",
      "File access permission boundaries",
      "External API call inspection",
      "Command pattern validation",
      "Arbitrary code execution prevention",
      "Service initialization security",
      "Tool invocation logging"
    ];
    
    // Create the prompt for structured output
    const prompt = `
    You are a security expert analyzing code repositories for vulnerabilities.
    
    Please perform a comprehensive security analysis on the following repository code and provide your results in a structured JSON format.
    
    For each of the following security categories, evaluate if the code has proper implementation or vulnerabilities:
    ${securityCategories.map(category => `- ${category}`).join('\n')}
    
    Your response must be a valid JSON object with the following structure:
    {
      "summary": "A brief summary of overall security posture",
      "categories": [
        {
          "name": "Category name",
          "passed": true/false,
          "description": "Brief explanation of the finding",
          "severity": "low/medium/high/critical",
          "recommendation": "How to fix or improve"
        },
        ...
      ]
    }
    
    For each category:
    - Set "passed" to true if the code properly implements this security measure
    - Set "passed" to false if the code is vulnerable or missing this security measure
    - Provide a concise description explaining your finding
    - Assign an appropriate severity level
    - Give a specific recommendation for improvement
    
    Repository code:
    ${JSON.stringify(req.body.content)}
    `;
    
    // Generate content using Gemini
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const analysisText = response.text();
    
    // Parse the JSON response
    let analysisJson;
    try {
      // Extract JSON if it's wrapped in markdown code blocks
      const jsonMatch = analysisText.match(/```json\s*([\s\S]*?)\s*```/) || 
                        analysisText.match(/```\s*([\s\S]*?)\s*```/) ||
                        [null, analysisText];
      
      const jsonString = jsonMatch[1].trim();
      analysisJson = JSON.parse(jsonString);
    } catch (error) {
      console.error("Error parsing JSON response:", error);
      return res.status(500).json({ 
        error: "Failed to parse structured analysis results",
        rawResponse: analysisText
      });
    }
    
    // Send the structured response back to the client
    res.json({ analysis: analysisJson });
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
