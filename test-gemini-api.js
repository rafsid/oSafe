import axios from 'axios';
import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
require('dotenv').config();

// Get API key from environment variables
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

// Sample repository code - your secure.sh script
const sampleRepoCode = {
  "secure.sh": `#!/bin/bash

# Remote connection details
REMOTE_USER="username"          # Replace with the remote username
REMOTE_HOST="192.168.1.100"     # Replace with the remote IP or hostname
REMOTE_PORT="22"               # Default SSH port, change if different

# Optional: Path to SSH key if using key-based authentication
SSH_KEY="/home/user/.ssh/id_rsa"

# Function to check if connection details are set
check_connection_details() {
    if [ -z "$REMOTE_USER" ] || [ -z "$REMOTE_HOST" ]; then
        echo "Error: Please set REMOTE_USER and REMOTE_HOST variables"
        exit 1
    fi
}

# Function to test if host is reachable
test_connection() {
    if ! ping -c 3 "$REMOTE_HOST" > /dev/null 2>&1; then
        echo "Warning: Host $REMOTE_HOST might not be reachable"
    fi
}

# Main connection function
connect_ssh() {
    echo "Attempting to connect to $REMOTE_USER@$REMOTE_HOST..."

    # Connection command with key-based auth
    if [ -n "$SSH_KEY" ]; then
        ssh -i "$SSH_KEY" -p "$REMOTE_PORT" "$REMOTE_USER@$REMOTE_HOST"
    else
        # Connection command with password auth
        ssh -p "$REMOTE_PORT" "$REMOTE_USER@$REMOTE_HOST"
    fi

    # Check if connection was successful
    if [ $? -eq 0 ]; then
        echo "Connection successful!"
    else
        echo "Connection failed. Please check:"
        echo "1. Network connectivity"
        echo "2. Username and host details"
        echo "3. SSH key permissions (if using)"
        echo "4. Remote server SSH configuration"
        exit 1
    fi
}

# Execute the connection process
check_connection_details
test_connection
connect_ssh`
};

// Security categories from your server.js
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

// Create the same prompt as in server.js
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
${JSON.stringify(sampleRepoCode)}
`;

async function testGeminiAPI() {
  try {
    console.log("Sending request to Gemini API...");
    
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${GOOGLE_API_KEY}`,
      {
        contents: [{ role: "user", parts: [{ text: schemaPrompt }] }],
        generationConfig: {
          temperature: 0.2,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 8192
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log("Response received!");
    
    // Extract the text from the response
    const responseText = response.data.candidates[0].content.parts[0].text;
    
    // Save raw response to file
    fs.writeFileSync('gemini-raw-response.txt', responseText);
    console.log("Raw response saved to gemini-raw-response.txt");
    
    // Try to parse the JSON response
    try {
      // Try to extract JSON if it's wrapped in markdown code blocks
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || 
                      responseText.match(/```\s*([\s\S]*?)\s*```/);
      
      let analysisJson;
      if (jsonMatch && jsonMatch[1]) {
        // If JSON is in code blocks, extract it
        const jsonString = jsonMatch[1].trim();
        console.log("Extracted JSON from code blocks");
        analysisJson = JSON.parse(jsonString);
      } else {
        // Otherwise try to parse the raw text as JSON
        console.log("Attempting to parse raw text as JSON");
        analysisJson = JSON.parse(responseText);
      }
      
      // Save parsed JSON to file
      fs.writeFileSync('gemini-parsed-response.json', JSON.stringify(analysisJson, null, 2));
      console.log("Parsed JSON saved to gemini-parsed-response.json");
    } catch (error) {
      console.error("Error parsing JSON response:", error);
    }
    
  } catch (error) {
    console.error("Error calling Gemini API:", error.response?.data || error.message);
  }
}

testGeminiAPI();