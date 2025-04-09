/**
 * Practical Project Building 🚀: A style focused on progressive learning with each slide building on the previous
 */
export const generatePracticalProjectStyle = (topic: string): { cssContent: string, jsContent: string } => {
  return {
    cssContent: `
      /* Practical Project Building Style - Progressive learning theme */
      :root {
        --primary-color: #0070F3;
        --secondary-color: #0366D6;
        --background-color: #FFFFFF;
        --panel-bg: #F6F8FA;
        --success-color: #28A745;
        --warning-color: #FFC107;
        --danger-color: #DC3545;
        --text-color: #24292E;
        --text-secondary: #586069;
        --border-color: #E1E4E8;
        --code-bg: #F6F8FA;
      }

      body, html {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        color: var(--text-color);
        background-color: var(--background-color);
        line-height: 1.6;
        max-width: 100%;
        margin: 0;
        padding: 0;
      }

      h1, h2, h3, h4, h5 {
        font-weight: 600;
        margin-bottom: 1rem;
        padding-left: 0;
        padding-right: 0;
      }

      h1 {
        font-size: 1.75rem;
        border-bottom: 1px solid var(--border-color);
        padding-bottom: 0.5rem;
      }

      h2 {
        font-size: 1.5rem;
      }

      /* Project Structure */
      .project-container {
        border: 1px solid var(--border-color);
        border-radius: 6px;
        overflow: hidden;
        margin-bottom: 1.5rem;
      }

      .project-header {
        background-color: var(--panel-bg);
        padding: 1rem;
        border-bottom: 1px solid var(--border-color);
        font-weight: 600;
      }

      .project-body {
        padding: 1rem;
      }

      /* Code samples */
      pre {
        background-color: var(--code-bg);
        border: 1px solid var(--border-color);
        border-radius: 6px;
        padding: 1rem 0.5rem;
        overflow-x: auto;
        margin: 1rem 0;
        font-size: 0.9rem;
        line-height: 1.5;
        max-width: 100%;
        margin-left: 0;
        margin-right: 0;
      }

      code {
        font-family: SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace;
        font-size: 0.9rem;
        background-color: rgba(27, 31, 35, 0.05);
        padding: 0.2em 0.4em;
        border-radius: 3px;
      }

      /* File explorer */
      .file-explorer {
        border: 1px solid var(--border-color);
        border-radius: 6px;
        overflow: hidden;
        margin-bottom: 1rem;
      }

      .file-explorer-header {
        background-color: var(--panel-bg);
        padding: 0.5rem 1rem;
        border-bottom: 1px solid var(--border-color);
        font-weight: 600;
        display: flex;
        align-items: center;
      }

      .file-explorer-item {
        display: flex;
        align-items: center;
        padding: 0.5rem 1rem;
        cursor: pointer;
        transition: background-color 0.2s;
      }

      .file-explorer-item:hover {
        background-color: var(--panel-bg);
      }

      .file-explorer-icon {
        margin-right: 0.5rem;
        color: var(--text-secondary);
      }

      .file-explorer-content {
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.3s ease-out;
      }

      .file-explorer-dir.open .file-explorer-content {
        max-height: 500px;
      }

      /* Task lists */
      .task-list {
        list-style-type: none;
        padding-left: 0;
      }

      .task-list-item {
        display: flex;
        align-items: flex-start;
        margin-bottom: 0.5rem;
      }

      .task-list-checkbox {
        margin-right: 0.5rem;
        margin-top: 0.3rem;
      }

      .task-list-text {
        flex: 1;
      }

      .task-complete {
        text-decoration: line-through;
        color: var(--text-secondary);
      }

      /* Step Progression */
      .steps-container {
        display: flex;
        margin: 2rem 0;
        position: relative;
        z-index: 1;
      }

      .steps-container:before {
        content: '';
        position: absolute;
        top: 14px;
        left: 0;
        right: 0;
        height: 2px;
        background-color: var(--border-color);
        z-index: -1;
      }

      .step {
        flex: 1;
        text-align: center;
        position: relative;
      }

      .step-circle {
        width: 30px;
        height: 30px;
        background-color: var(--panel-bg);
        border: 2px solid var(--border-color);
        border-radius: 50%;
        margin: 0 auto 0.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        color: var(--text-secondary);
      }

      .step.active .step-circle {
        background-color: var(--primary-color);
        border-color: var(--primary-color);
        color: white;
      }

      .step.completed .step-circle {
        background-color: var(--success-color);
        border-color: var(--success-color);
        color: white;
      }

      .step-label {
        font-size: 0.8rem;
        color: var(--text-secondary);
      }

      .step.active .step-label {
        color: var(--primary-color);
        font-weight: 600;
      }

      .step.completed .step-label {
        color: var(--success-color);
      }

      /* Alerts and notices */
      .alert {
        padding: 1rem;
        border-radius: 6px;
        margin-bottom: 1rem;
        border-left: 4px solid;
      }

      .alert-info {
        background-color: rgba(3, 102, 214, 0.1);
        border-left-color: var(--primary-color);
      }

      .alert-warning {
        background-color: rgba(255, 193, 7, 0.1);
        border-left-color: var(--warning-color);
      }

      .alert-danger {
        background-color: rgba(220, 53, 69, 0.1);
        border-left-color: var(--danger-color);
      }

      .alert-success {
        background-color: rgba(40, 167, 69, 0.1);
        border-left-color: var(--success-color);
      }

      /* Code diff styling */
      .diff-toggle {
        display: inline-block;
        background-color: var(--panel-bg);
        border: 1px solid var(--border-color);
        border-radius: 6px;
        padding: 0.3rem 0.6rem;
        font-size: 0.8rem;
        cursor: pointer;
        margin-bottom: 0.5rem;
      }

      .diff-content {
        border: 1px solid var(--border-color);
        border-radius: 6px;
        margin-bottom: 1rem;
        font-family: SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace;
        font-size: 0.9rem;
      }

      .diff-line {
        padding: 0.2rem 0.5rem;
        white-space: pre;
      }

      .diff-added {
        background-color: rgba(40, 167, 69, 0.1);
        border-left: 3px solid var(--success-color);
      }

      .diff-removed {
        background-color: rgba(220, 53, 69, 0.1);
        border-left: 3px solid var(--danger-color);
      }
      
      /* Quiz elements */
      .quiz-container {
        background-color: var(--panel-bg);
        border: 1px solid var(--border-color);
        border-radius: 6px;
        padding: 1.5rem;
        margin: 1.5rem 0;
      }
      
      .quiz-question {
        font-weight: 600;
        margin-bottom: 1rem;
      }
      
      .quiz-option {
        display: flex;
        align-items: center;
        background-color: var(--background-color);
        border: 1px solid var(--border-color);
        border-radius: 6px;
        padding: 12px 16px;
        margin-bottom: 10px;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .quiz-option:hover {
        border-color: var(--primary-color);
        background-color: rgba(0, 112, 243, 0.05);
      }
      
      .quiz-option.correct {
        background-color: rgba(40, 167, 69, 0.1);
        border-color: var(--success-color);
      }
      
      .quiz-option.incorrect {
        background-color: rgba(220, 53, 69, 0.1);
        border-color: var(--danger-color);
      }
      
      #feedback-correct, #feedback-incorrect {
        padding: 12px 16px;
        border-radius: 6px;
        margin-top: 16px;
        font-weight: 500;
        display: none;
      }
      
      #feedback-correct {
        background-color: rgba(40, 167, 69, 0.1);
        color: var(--success-color);
        border: 1px solid var(--success-color);
      }
      
      #feedback-incorrect {
        background-color: rgba(220, 53, 69, 0.1);
        color: var(--danger-color);
        border: 1px solid var(--danger-color);
      }

      /* Buttons */
      button {
        background-color: var(--primary-color);
        color: white;
        border: none;
        border-radius: 6px;
        padding: 0.5rem 1rem;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s;
      }

      button:hover {
        background-color: #0366D6;
      }

      button.secondary {
        background-color: var(--background-color);
        color: var(--text-color);
        border: 1px solid var(--border-color);
      }

      button.secondary:hover {
        background-color: var(--panel-bg);
      }
    `,
    jsContent: `
      // Practical Project Style - Helper JavaScript functions
      document.addEventListener('DOMContentLoaded', function() {
        // File explorer functionality
        const initFileExplorer = () => {
          const folders = document.querySelectorAll('.file-explorer-dir');
          folders.forEach(folder => {
            const folderHeader = folder.querySelector('.file-explorer-item');
            folderHeader.addEventListener('click', () => {
              folder.classList.toggle('open');
              
              const icon = folderHeader.querySelector('.file-explorer-icon');
              if (folder.classList.contains('open')) {
                icon.textContent = '📂';
              } else {
                icon.textContent = '📁';
              }
            });
          });
          
          const files = document.querySelectorAll('.file-explorer-file');
          files.forEach(file => {
            file.addEventListener('click', () => {
              // In a real implementation, this would display the file content
              console.log('File clicked:', file.textContent);
            });
          });
        };
        
        // Task list functionality
        const initTaskLists = () => {
          const checkboxes = document.querySelectorAll('.task-list-checkbox');
          checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
              const taskText = checkbox.nextElementSibling;
              if (checkbox.checked) {
                taskText.classList.add('task-complete');
              } else {
                taskText.classList.remove('task-complete');
              }
            });
          });
        };
        
        // Step progression
        const initStepProgression = () => {
          const steps = document.querySelectorAll('.step');
          const nextBtn = document.querySelector('.next-step');
          const prevBtn = document.querySelector('.prev-step');
          
          if (nextBtn) {
            nextBtn.addEventListener('click', () => {
              let currentActive;
              steps.forEach((step, index) => {
                if (step.classList.contains('active')) {
                  currentActive = index;
                }
              });
              
              if (currentActive < steps.length - 1) {
                steps[currentActive].classList.remove('active');
                steps[currentActive].classList.add('completed');
                steps[currentActive + 1].classList.add('active');
              }
            });
          }
          
          if (prevBtn) {
            prevBtn.addEventListener('click', () => {
              let currentActive;
              steps.forEach((step, index) => {
                if (step.classList.contains('active')) {
                  currentActive = index;
                }
              });
              
              if (currentActive > 0) {
                steps[currentActive].classList.remove('active');
                steps[currentActive - 1].classList.remove('completed');
                steps[currentActive - 1].classList.add('active');
              }
            });
          }
        };
        
        // Code diff visualization
        const initCodeDiffs = () => {
          const diffToggles = document.querySelectorAll('.diff-toggle');
          
          diffToggles.forEach(toggle => {
            toggle.addEventListener('click', () => {
              const diffId = toggle.dataset.diff;
              const diffContent = document.querySelector(\`.diff-content[data-diff="\${diffId}"]\`);
              
              if (diffContent) {
                diffContent.classList.toggle('hidden');
                toggle.textContent = diffContent.classList.contains('hidden') ? 'Show Changes' : 'Hide Changes';
              }
            });
          });
        };
        
        // Initialize quiz functionality if it exists
        const quizOptions = document.querySelectorAll('.quiz-option');
        if (quizOptions.length > 0) {
          quizOptions.forEach(option => {
            option.addEventListener('click', () => {
              window.selectOption(option.getAttribute('data-option'));
            });
          });
        }
        
        // Initialize all components
        initFileExplorer();
        initTaskLists();
        initStepProgression();
        initCodeDiffs();
      });
    `
  };
};