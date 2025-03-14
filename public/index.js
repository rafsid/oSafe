document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const repoForm = document.getElementById('repoForm');
  const repoUrlInput = document.getElementById('repoUrl');
  // Remove transformed URL element references
  // const transformedUrlContainer = document.getElementById('transformedUrlContainer');
  // const transformedUrlElement = document.getElementById('transformedUrl');
  const processSection = document.getElementById('processSection');
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');
  const resultsSection = document.getElementById('resultsSection');
  const resultContainer = document.getElementById('resultContainer');
  const step1 = document.getElementById('step1');
  const step2 = document.getElementById('step2');
  const step3 = document.getElementById('step3');
  const step4 = document.getElementById('step4');

  // Hide progress text initially
  progressText.textContent = '';

  // Event Listeners
  repoForm.addEventListener('submit', handleFormSubmit);

  // Form submission handler
  async function handleFormSubmit(e) {
    e.preventDefault();
    
    // Reset UI
    resetUI();
    
    // Get and validate repository URL
    const repoUrl = repoUrlInput.value.trim();
    if (!isValidGithubUrl(repoUrl)) {
      showError('Please enter a valid GitHub repository URL (e.g., https://github.com/username/repo)');
      return;
    }
    
    // Show process section
    processSection.classList.remove('hidden');
    
    // Step 1: Fetching
    updateProgress(25, 'Fetching repository content...', 1);
    
    try {
      // Transform GitHub URL to raw content URL
      const transformedUrl = transformGithubUrl(repoUrl);
      
      // Remove displaying the transformed URL to the user
      // transformedUrlElement.textContent = transformedUrl;
      // transformedUrlContainer.classList.remove('hidden');
      
      // Step 2: Processing
      updateProgress(50, 'Processing repository content...', 2);
      
      // Fetch repository content
      const response = await fetch('/api/fetch-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: transformedUrl }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch repository content');
      }
      
      const repoData = await response.json();
      
      // Step 3: Analyzing
      updateProgress(75, 'Analyzing security vulnerabilities...', 3);
      
      // Perform security analysis
      const securityResponse = await fetch('/api/analyze-security', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: repoData.content }),
      });
      
      if (!securityResponse.ok) {
        const errorData = await securityResponse.json();
        throw new Error(errorData.error || 'Failed to analyze security vulnerabilities');
      }
      
      const securityResults = await securityResponse.json();
      
      // Step 4: Complete
      updateProgress(100, 'Analysis complete!', 4);
      
      // Display results
      displayResults(securityResults.analysis);
      
    } catch (error) {
      console.error('Error:', error);
      showError(error.message || 'An unexpected error occurred');
    }
  }

  // Update progress bar and text
  function updateProgress(percentage, message, stepNumber) {
    progressBar.style.width = `${percentage}%`;
    progressText.textContent = message;
    
    // Update step indicators
    const steps = [step1, step2, step3, step4];
    steps.forEach((step, index) => {
      if (index < stepNumber) {
        step.classList.add('active');
      } else {
        step.classList.remove('active');
      }
    });
  }

  // Display security analysis results
  function displayResults(results) {
    resultsSection.classList.remove('hidden');
    
    try {
      // Create summary section
      const summarySection = document.createElement('div');
      summarySection.className = 'summary-section';
      summarySection.innerHTML = `
        <h3>Security Analysis Summary</h3>
        <p>${results.summary}</p>
      `;
      
      // Create categories section
      const categoriesSection = document.createElement('div');
      categoriesSection.className = 'categories-section';
      categoriesSection.innerHTML = '<h3>Security Checks</h3>';
      
      // Create a simple list for security checks
      const securityList = document.createElement('div');
      securityList.className = 'security-list';
      
      // Add security check items
      results.categories.forEach(category => {
        // Create item for each security check
        const checkItem = document.createElement('div');
        checkItem.className = 'security-check-item';
        
        // Create item header
        const itemHeader = document.createElement('div');
        itemHeader.className = 'check-item-header';
        
        // Create status indicator
        const statusIndicator = document.createElement('span');
        statusIndicator.className = `check-status ${category.passed ? 'passed' : 'failed'}`;
        statusIndicator.innerHTML = category.passed ? '✓' : '✗';
        
        // Create name element
        const nameElement = document.createElement('span');
        nameElement.className = 'check-name';
        nameElement.textContent = category.name;
        
        // Create severity element
        const severityElement = document.createElement('span');
        severityElement.className = `severity-indicator severity-${category.severity.toLowerCase()}`;
        severityElement.textContent = category.severity;
        
        // Add elements to header
        itemHeader.appendChild(statusIndicator);
        itemHeader.appendChild(nameElement);
        itemHeader.appendChild(severityElement);
        
        // Create details container (initially hidden)
        const detailsContainer = document.createElement('div');
        detailsContainer.className = 'check-details hidden';
        detailsContainer.innerHTML = `
          <div class="description">${category.description}</div>
          <div class="recommendation">${category.recommendation}</div>
        `;
        
        // Add header and details to item
        checkItem.appendChild(itemHeader);
        checkItem.appendChild(detailsContainer);
        
        // Add click event to toggle details
        itemHeader.addEventListener('click', () => {
          detailsContainer.classList.toggle('hidden');
        });
        
        // Add item to list
        securityList.appendChild(checkItem);
      });
      
      // Add list to categories section
      categoriesSection.appendChild(securityList);
      
      // Create result card
      const resultCard = document.createElement('div');
      resultCard.className = 'result-card';
      resultCard.appendChild(summarySection);
      resultCard.appendChild(categoriesSection);
      
      // Add result card to container
      resultContainer.innerHTML = '';
      resultContainer.appendChild(resultCard);
      
    } catch (error) {
      console.error('Error displaying results:', error);
      showError('Failed to display results. Please try again.');
    }
  }

  // Show error message
  function showError(message) {
    resultsSection.classList.remove('hidden');
    resultContainer.innerHTML = `
      <div class="error-card">
        <div class="error-icon">⚠️</div>
        <div class="error-message">${message}</div>
      </div>
    `;
  }

  // Reset UI elements
  function resetUI() {
    // Remove reference to transformedUrlContainer since we're not using it
    // transformedUrlContainer.classList.add('hidden');
    processSection.classList.add('hidden');
    resultsSection.classList.add('hidden');
    progressBar.style.width = '0';
    // Don't set any text here, it will be set when updateProgress is called
    progressText.textContent = '';
    resultContainer.innerHTML = '';
    
    // Reset step indicators
    const steps = [step1, step2, step3, step4];
    steps.forEach(step => step.classList.remove('active'));
  }

  // Validate GitHub URL
  function isValidGithubUrl(url) {
    const githubRegex = /^https:\/\/github\.com\/[a-zA-Z0-9-_.]+\/[a-zA-Z0-9-_.]+\/?$/;
    return githubRegex.test(url);
  }

  // Transform GitHub URL to raw content URL
  function transformGithubUrl(url) {
    // Remove trailing slash if present
    const cleanUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    
    // Replace github.com with uithub.com
    return cleanUrl
      .replace('github.com', 'uithub.com');
  }
});
