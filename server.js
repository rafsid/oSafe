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
    
    // Initialize the Gemini model
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash"
    });
    
    try {
      // First try a simpler approach with text-based schema
      const schemaPrompt = `
      You are a security expert analyzing code repositories for vulnerabilities.
      
      Please perform a comprehensive security analysis on the following repository code.
      
      For each of the following security categories, evaluate if the code has proper implementation or vulnerabilities:
      ${securityCategories.map(category => `- ${category}`).join('\n')}
      
      For each category:
      - Set "passed" to true if the code properly implements this security measure
      - Set "passed" to false if the code is vulnerable or missing this security measure
      - Provide a concise description explaining your finding
      - Assign an appropriate severity level (low/medium/high/critical)
      - Give a specific recommendation for improvement
      
      Your response MUST be valid JSON with the following structure:
      
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
      
      Repository code:
      ${JSON.stringify(req.body.content)}
      `;
      
      // Generate content using Gemini with text-based schema
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: schemaPrompt }] }],
        generationConfig: {
          temperature: 0.2,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 8192
        }
      });
      
      // Get the response
      const response = await result.response;
      const responseText = response.text();
      
      console.log("Raw response first 200 chars:", responseText.substring(0, 200));
      console.log("Raw response last 200 chars:", responseText.substring(responseText.length - 200));
      
      // Try to extract JSON if it's wrapped in markdown code blocks
      let analysisJson;
      try {
        const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || 
                        responseText.match(/```\s*([\s\S]*?)\s*```/);
        
        if (jsonMatch && jsonMatch[1]) {
          // If JSON is in code blocks, extract it
          const jsonString = jsonMatch[1].trim();
          console.log("Extracted JSON from code blocks");
          analysisJson = JSON.parse(jsonString);
        } else {
          // Otherwise try to parse the raw text as JSON
          console.log("Attempting to parse raw text as JSON");
          
          try {
            // First try direct parsing
            analysisJson = JSON.parse(responseText);
          } catch (directParseError) {
            console.log("Direct parsing failed, attempting to clean response");
            
            // Try to clean the response if it has any invalid characters
            let cleanedResponse = responseText;
            
            // Check if the response starts with a markdown code block indicator
            if (cleanedResponse.trim().startsWith('```')) {
              // Remove everything before the first { and after the last }
              const firstBrace = cleanedResponse.indexOf('{');
              const lastBrace = cleanedResponse.lastIndexOf('}');
              
              if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                cleanedResponse = cleanedResponse.substring(firstBrace, lastBrace + 1);
              }
            }
            
            try {
              analysisJson = JSON.parse(cleanedResponse);
            } catch (cleanedParseError) {
              console.error("Failed to parse cleaned response:", cleanedParseError);
              
              // Last resort: try to manually construct a valid JSON object
              const summaryMatch = responseText.match(/"summary"\s*:\s*"([^"]*)"/);
              
              if (summaryMatch) {
                console.log("Attempting to manually extract JSON structure");
                // Manually construct a fallback JSON object
                analysisJson = {
                  summary: summaryMatch[1] || "Security analysis completed with parsing issues",
                  categories: securityCategories.map(category => ({
                    name: category,
                    passed: false,
                    description: "Could not analyze this category due to parsing error.",
                    severity: "medium",
                    recommendation: "Please try again or contact support if the issue persists."
                  }))
                };
              } else {
                throw new Error("Could not extract valid JSON structure from response");
              }
            }
          }
        }
        
        // Validate that the parsed JSON has the expected structure
        if (!analysisJson.summary || !Array.isArray(analysisJson.categories)) {
          throw new Error("Response does not match expected schema");
        }
        
      } catch (error) {
        console.error("Error parsing JSON response:", error);
        
        // Fallback: Create a structured response manually
        analysisJson = {
          summary: "Failed to parse the security analysis results. The analysis was performed but the results could not be structured properly.",
          categories: securityCategories.map(category => ({
            name: category,
            passed: false,
            description: "Could not analyze this category due to parsing error.",
            severity: "medium",
            recommendation: "Please try again or contact support if the issue persists."
          }))
        };
      }
      
      // Send the structured response back to the client
      res.json({ analysis: analysisJson });
    } catch (error) {
      console.error("Error with text-based schema approach:", error);
      if (error.status === 503) {
        // Fallback to a simpler analysis or pre-cached results
        const simplifiedAnalysis = {
          summary: "Basic security analysis (AI service unavailable)",
          categories: securityCategories.map(category => ({
            name: category,
            passed: null, // Unknown
            description: "This check could not be performed because the AI service is currently unavailable.",
            severity: "unknown",
            recommendation: "Try again later when the service is less busy."
          }))
        };
        res.json({ analysis: simplifiedAnalysis });
      } else {
        // Handle other errors as before
        res.status(500).json({ error: "Failed to analyze security. Please try again later." });
      }
    }
    
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
