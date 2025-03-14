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
