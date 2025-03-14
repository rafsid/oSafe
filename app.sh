# Create project directory
mkdir -p oSafe/public/assets

# Navigate to project directory
cd oSafe

# Create server file
cat > server.js << 'EOF'
const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

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

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
EOF

# Create HTML file
cat > public/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GitHub Security Analyzer | OLabs Pro</title>
  <link rel="stylesheet" href="styles.css">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/marked/4.3.0/marked.min.js"></script>
</head>
<body>
  <div class="app-container">
    <header class="glass-header">
      <div class="logo-container">
        <img src="/assets/logo.svg" alt="OLabs Pro Logo" class="logo">
        <h1>GitHub Security Analyzer</h1>
      </div>
      <nav class="glass-nav">
        <a href="https://www.olabs.pro/" class="nav-link">Home</a>
        <a href="#about" class="nav-link">About</a>
        <a href="#contact" class="nav-link">Contact</a>
      </nav>
    </header>

    <main>
      <section class="input-section">
        <div class="neumorphic-card">
          <form id="repo-form">
            <div class="input-container">
              <span class="input-icon">
                <svg viewBox="0 0 24 24" width="24" height="24">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
                </svg>
              </span>
              <input 
                type="url" 
                id="repo-url" 
                class="neumorphic-input"
                placeholder="Enter GitHub repository URL" 
                required
                pattern="https://github.com/[a-zA-Z0-9-_.]+/[a-zA-Z0-9-_.]+(/)?$"
              >
            </div>
            <button type="submit" id="analyze-btn" class="neumorphic-button">
              Analyze Repository
            </button>
          </form>
        </div>
      </section>

      <section class="transformed-url-container hidden">
        <div class="glass-card">
          <h3>Transformed URL:</h3>
          <p id="transformed-url" class="url-text"></p>
        </div>
      </section>

      <section class="process-section">
        <div class="glass-card process-card">
          <div class="process-steps">
            <div class="step active">
              <div class="step-icon">1</div>
              <div class="step-label">Validation</div>
            </div>
            <div class="step-connector"></div>
            <div class="step">
              <div class="step-icon">2</div>
              <div class="step-label">Transformation</div>
            </div>
            <div class="step-connector"></div>
            <div class="step">
              <div class="step-icon">3</div>
              <div class="step-label">Content Fetching</div>
            </div>
            <div class="step-connector"></div>
            <div class="step">
              <div class="step-icon">4</div>
              <div class="step-label">Security Analysis</div>
            </div>
          </div>
          
          <div class="progress-container">
            <div class="progress-bar" id="progress-bar"></div>
          </div>
          <div class="progress-text" id="progress-text">Ready to analyze</div>
        </div>
      </section>

      <section class="results-section">
        <div id="result-container" class="glass-card result-container">
          <!-- Results will be displayed here -->
        </div>
      </section>
    </main>

    <footer class="glass-footer">
      <p>&copy; 2025 OLabs Pro. All rights reserved.</p>
      <div class="footer-links">
        <a href="https://www.olabs.pro/privacy" class="footer-link">Privacy Policy</a>
        <a href="https://www.olabs.pro/terms" class="footer-link">Terms of Service</a>
      </div>
    </footer>
  </div>

  <script src="index.js"></script>
</body>
</html>
EOF

# Create CSS file
cat > public/styles.css << 'EOF'
/* Base styles and variables */
:root {
  --primary-color: #6366f1;
  --secondary-color: #4f46e5;
  --background-gradient: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  --glass-background: rgba(255, 255, 255, 0.25);
  --glass-border: 1px solid rgba(255, 255, 255, 0.18);
  --glass-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
  --neumorphic-light: #ffffff;
  --neumorphic-dark: #d1d9e6;
  --neumorphic-flat: #f0f4fa;
  --text-primary: #1e293b;
  --text-secondary: #475569;
  --border-radius: 16px;
  --transition-speed: 0.3s;
}

/* Global styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--background-gradient);
  color: var(--text-primary);
  min-height: 100vh;
  line-height: 1.6;
}

.app-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

/* Glassmorphism header */
.glass-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  margin-bottom: 2rem;
  background: var(--glass-background);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-radius: var(--border-radius);
  border: var(--glass-border);
  box-shadow: var(--glass-shadow);
}

.logo-container {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.logo {
  width: 40px;
  height: 40px;
}

.glass-header h1 {
  font-weight: 700;
  font-size: 1.8rem;
  color: var(--primary-color);
}

.glass-nav {
  display: flex;
  gap: 1.5rem;
}

.nav-link {
  color: var(--text-secondary);
  text-decoration: none;
  font-weight: 500;
  transition: color var(--transition-speed);
}

.nav-link:hover {
  color: var(--primary-color);
}

/* Neumorphic input section */
.input-section {
  margin-bottom: 2rem;
}

.neumorphic-card {
  background: var(--neumorphic-flat);
  border-radius: var(--border-radius);
  padding: 2rem;
  box-shadow: 
    8px 8px 16px var(--neumorphic-dark),
    -8px -8px 16px var(--neumorphic-light);
}

.input-container {
  position: relative;
  margin-bottom: 1.5rem;
}

.input-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  fill: var(--text-secondary);
}

.neumorphic-input {
  width: 100%;
  padding: 1rem 1rem 1rem 3rem;
  border: none;
  border-radius: 50px;
  background: var(--neumorphic-flat);
  box-shadow: 
    inset 5px 5px 10px var(--neumorphic-dark),
    inset -5px -5px 10px var(--neumorphic-light);
  color: var(--text-primary);
  font-size: 1rem;
  transition: all var(--transition-speed);
}

.neumorphic-input:focus {
  outline: none;
  box-shadow: 
    inset 5px 5px 10px var(--neumorphic-dark),
    inset -5px -5px 10px var(--neumorphic-light),
    0 0 0 4px rgba(99, 102, 241, 0.1);
}

.neumorphic-input::placeholder {
  color: var(--text-secondary);
  opacity: 0.6;
}

.neumorphic-button {
  display: block;
  width: 100%;
  padding: 1rem 2rem;
  border: none;
  border-radius: 50px;
  background: linear-gradient(145deg, var(--primary-color), var(--secondary-color));
  color: white;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 
    6px 6px 12px var(--neumorphic-dark),
    -6px -6px 12px var(--neumorphic-light);
  transition: all var(--transition-speed);
}

.neumorphic-button:hover {
  transform: translateY(-2px);
  box-shadow: 
    8px 8px 16px var(--neumorphic-dark),
    -8px -8px 16px var(--neumorphic-light);
}

.neumorphic-button:active {
  transform: translateY(0);
  box-shadow: 
    4px 4px 8px var(--neumorphic-dark),
    -4px -4px 8px var(--neumorphic-light);
}

/* Transformed URL section */
.transformed-url-container {
  margin-bottom: 2rem;
  transition: opacity var(--transition-speed), transform var(--transition-speed);
}

.transformed-url-container.hidden {
  opacity: 0;
  transform: translateY(-20px);
  height: 0;
  margin: 0;
  overflow: hidden;
}

.url-text {
  font-family: monospace;
  padding: 0.5rem;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
  word-break: break-all;
}

/* Process section */
.process-section {
  margin-bottom: 2rem;
}

.process-card {
  padding: 2rem;
}

.process-steps {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  z-index: 1;
}

.step-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--neumorphic-flat);
  box-shadow: 
    5px 5px 10px var(--neumorphic-dark),
    -5px -5px 10px var(--neumorphic-light);
  color: var(--text-secondary);
  font-weight: 600;
  margin-bottom: 0.5rem;
  transition: all var(--transition-speed);
}

.step.active .step-icon {
  background: var(--primary-color);
  color: white;
  box-shadow: 
    0 0 15px var(--primary-color);
}

.step-label {
  font-size: 0.875rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.step.active .step-label {
  color: var(--primary-color);
  font-weight: 600;
}

.step-connector {
  flex-grow: 1;
  height: 2px;
  background: var(--neumorphic-dark);
  margin: 0 0.5rem;
}

.progress-container {
  width: 100%;
  height: 10px;
  background: var(--neumorphic-flat);
  border-radius: 10px;
  margin-bottom: 1rem;
  box-shadow: 
    inset 3px 3px 6px var(--neumorphic-dark),
    inset -3px -3px 6px var(--neumorphic-light);
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--primary-color), var(--secondary-color));
  border-radius: 10px;
  transition: width 0.5s ease-in-out;
  width: 0;
}

.progress-text {
  text-align: center;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

/* Results section */
.results-section {
  flex-grow: 1;
  margin-bottom: 2rem;
}

.result-container {
  min-height: 200px;
  padding: 0;
  overflow: hidden;
}

.result-card {
  padding: 2rem;
}

.result-card h2 {
  margin-bottom: 1rem;
  color: var(--primary-color);
  font-weight: 700;
}

.markdown-content {
  line-height: 1.7;
}

.markdown-content h1, 
.markdown-content h2, 
.markdown-content h3 {
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
  color: var(--text-primary);
}

.markdown-content p {
  margin-bottom: 1rem;
}

.markdown-content pre {
  padding: 1rem;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  overflow-x: auto;
  margin: 1rem 0;
}

.markdown-content code {
  font-family: 'Fira Code', monospace;
  font-size: 0.9rem;
}

.error-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
}

.error-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  color: #ef4444;
}

.error-message {
  font-size: 1.1rem;
  color: var(--text-primary);
  max-width: 500px;
}

/* Glass card component */
.glass-card {
  background: var(--glass-background);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-radius: var(--border-radius);
  border: var(--glass-border);
  box-shadow: var(--glass-shadow);
  padding: 1.5rem;
}

/* Footer */
.glass-footer {
  margin-top: auto;
  padding: 1.5rem;
  text-align: center;
  background: var(--glass-background);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-radius: var(--border-radius);
  border: var(--glass-border);
  box-shadow: var(--glass-shadow);
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.footer-links {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  margin-top: 0.5rem;
}

.footer-link {
  color: var(--primary-color);
  text-decoration: none;
  transition: opacity var(--transition-speed);
}

.footer-link:hover {
  opacity: 0.8;
}

/* Loading spinner */
.spinner {
  display: inline-block;
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #fff;
  animation: spin 1s ease-in-out infinite;
  margin-right: 0.5rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Responsive styles */
@media (max-width: 768px) {
  .app-container {
    padding: 1rem;
  }
  
  .glass-header {
    flex-direction: column;
    gap: 1rem;
  }
  
  .process-steps {
    flex-direction: column;
    gap: 1.5rem;
  }
  
  .step-connector {
    width: 2px;
    height: 20px;
    margin: 0;
  }
}
EOF

# Create JavaScript file
cat > public/index.js << 'EOF'
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('repo-form');
  const urlInput = document.getElementById('repo-url');
  const analyzeBtn = document.getElementById('analyze-btn');
  const resultContainer = document.getElementById('result-container');
  const progressBar = document.getElementById('progress-bar');
  const progressText = document.getElementById('progress-text');
  const transformedUrlDisplay = document.getElementById('transformed-url');
  const steps = document.querySelectorAll('.step');
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Reset UI state
    resultContainer.innerHTML = '';
    progressBar.style.width = '0%';
    progressText.textContent = 'Starting...';
    steps.forEach(step => step.classList.remove('active'));
    steps[0].classList.add('active');
    
    // Validate GitHub URL
    const githubUrl = urlInput.value.trim();
    if (!isValidGithubUrl(githubUrl)) {
      showError('Please enter a valid GitHub repository URL');
      return;
    }
    
    // Disable button and show loading state
    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = '<span class="spinner"></span> Analyzing...';
    
    try {
      // Step 1: Transform URL
      progressBar.style.width = '10%';
      progressText.textContent = 'Transforming URL...';
      
      // Update step indicators
      steps[0].classList.remove('active');
      steps[1].classList.add('active');
      
      const transformedUrl = githubUrl.replace('github.com', 'uithub.com');
      transformedUrlDisplay.textContent = transformedUrl;
      transformedUrlDisplay.parentElement.classList.remove('hidden');
      
      // Short delay to show the transformation step
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Step 2: Fetch content from uithub.com
      progressBar.style.width = '30%';
      progressText.textContent = 'Fetching repository content...';
      
      // Update step indicators
      steps[1].classList.remove('active');
      steps[2].classList.add('active');
      
      const response = await fetch('/api/fetch-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: transformedUrl })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch repository content');
      }
      
      // Step 3: Process and analyze content
      progressBar.style.width = '60%';
      progressText.textContent = 'Analyzing repository...';
      
      // Update step indicators
      steps[2].classList.remove('active');
      steps[3].classList.add('active');
      
      const data = await response.json();
      
      // Step 4: Send to Groq API
      progressBar.style.width = '80%';
      progressText.textContent = 'Generating security report...';
      
      const analysisResponse = await fetch('/api/analyze-security', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: data.content })
      });
      
      if (!analysisResponse.ok) {
        const error = await analysisResponse.json();
        throw new Error(error.message || 'Failed to analyze repository');
      }
      
      // Display results
      progressBar.style.width = '100%';
      progressText.textContent = 'Complete!';
      
      const analysisData = await analysisResponse.json();
      displayResults(analysisData.analysis);
      
    } catch (error) {
      showError(error.message);
    } finally {
      // Reset button state
      analyzeBtn.disabled = false;
      analyzeBtn.textContent = 'Analyze Repository';
    }
  });
  
  function isValidGithubUrl(url) {
    // Basic GitHub URL validation
    const pattern = /^https:\/\/github\.com\/[a-zA-Z0-9-_.]+\/[a-zA-Z0-9-_.]+\/?$/i;
    return pattern.test(url);
  }
  
  function showError(message) {
    resultContainer.innerHTML = `
      <div class="error-card">
        <div class="error-icon">❌</div>
        <div class="error-message">${message}</div>
      </div>
    `;
  }
  
  function displayResults(analysis) {
    // Format and display the security analysis results
    resultContainer.innerHTML = `
      <div class="result-card">
        <h2>Security Analysis Results</h2>
        <div class="markdown-content">${marked.parse(analysis)}</div>
      </div>
    `;
  }
});
EOF

# Create logo SVG file
mkdir -p public/assets
cat > public/assets/logo.svg << 'EOF'
<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="40" height="40" rx="8" fill="#6366F1" />
  <path d="M12 12L28 12L28 28L12 28L12 12Z" stroke="white" stroke-width="2" />
  <path d="M16 16L24 16" stroke="white" stroke-width="2" stroke-linecap="round" />
  <path d="M16 20L24 20" stroke="white" stroke-width="2" stroke-linecap="round" />
  <path d="M16 24L20 24" stroke="white" stroke-width="2" stroke-linecap="round" />
  <circle cx="26" cy="24" r="2" fill="white" />
</svg>
EOF

# Create package.json file
cat > package.json << 'EOF'
{
  "name": "oSafe",
  "version": "1.0.0",
  "description": "A security analysis tool for GitHub repositories",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "keywords": [
  "oSafe",
  "oLabs",
    "github",
    "security",
    "analysis",
    "groq",
    "api"
  ],
  "author": "OLabs",
  "license": "MIT",
  "dependencies": {
    "axios": "^1.6.7",
    "dotenv": "^16.4.1",
    "express": "^4.18.2"
  },
  "devDependencies": {
    "nodemon": "^3.0.3"
  }
}
EOF

# Create .env file for Groq API key
cat > .env << 'EOF'
# Add your Groq API key here
GROQ_API_KEY=your_groq_api_key_here
PORT=3000
EOF

# Display completion message
echo "oSafe project created successfully!"
echo "To start the application:"
echo "1. Edit the .env file to add your Groq API key"
echo "2. Run 'npm start' to start the server"
echo "3. Visit http://localhost:3000 in your browser"