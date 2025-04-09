/**
 * Brown Markdown 🏖️: A relaxed, earthy style with tan/beige/brown colors
 */
export const generateBrownMarkdownStyle = (topic: string): { cssContent: string, jsContent: string } => {
  return {
    cssContent: `
      /* Brown Markdown Style - Relaxed, earthy theme */
      :root {
        --primary-color: #8B4513;
        --secondary-color: #A0522D;
        --background-color: #F5F5DC;
        --text-color: #3E2723;
        --accent-color: #D2B48C;
        --highlight-color: #CD853F;
        --code-bg: #F0E6D2;
        --info-bg: #E6D9B8;
        --warning-bg: #F8D7DA;
        --success-color: #4CAF50;
        --error-color: #F44336;
      }

      body, html {
        font-family: 'Georgia', serif;
        color: var(--text-color);
        background-color: var(--background-color);
        line-height: 1.6;
        max-width: 100%;
        margin: 0;
        padding: 0;
      }

      h1, h2, h3, h4, h5 {
        font-family: 'Bookman', serif;
        color: var(--primary-color);
        margin-bottom: 1rem;
        border-bottom: 1px solid var(--accent-color);
        padding-bottom: 0.5rem;
        padding-left: 0;
        padding-right: 0;
      }

      code {
        font-family: 'Courier New', monospace;
        background-color: var(--code-bg);
        padding: 0.2rem 0.4rem;
        border-radius: 3px;
        font-size: 0.9em;
      }

      pre {
        background-color: var(--code-bg);
        padding: 1rem 0.5rem;
        border-radius: 5px;
        border-left: 4px solid var(--primary-color);
        overflow-x: auto;
        max-width: 100%;
        margin-left: 0;
        margin-right: 0;
      }

      blockquote {
        border-left: 4px solid var(--accent-color);
        padding-left: 1rem;
        margin-left: 0;
        color: var(--secondary-color);
        font-style: italic;
      }

      /* Special elements */
      .info-box {
        background-color: var(--info-bg);
        border-left: 4px solid var(--primary-color);
        padding: 1rem;
        margin: 1rem 0;
        border-radius: 5px;
      }

      .warning-box {
        background-color: var(--warning-bg);
        border-left: 4px solid #DC3545;
        padding: 1rem;
        margin: 1rem 0;
        border-radius: 5px;
      }

      .hint-box {
        background-color: var(--accent-color);
        border-left: 4px solid var(--highlight-color);
        padding: 1rem;
        margin: 1rem 0;
        border-radius: 5px;
        position: relative;
      }

      /* Challenge and Quiz styling */
      .challenge-container, .quiz-container {
        background-color: var(--info-bg);
        border: 1px solid var(--accent-color);
        border-radius: 8px;
        padding: 1.5rem;
        margin: 2rem 0;
        box-shadow: 0 4px 8px rgba(62, 39, 35, 0.1);
      }

      /* Quiz elements */
      .quiz-option {
        display: block;
        background-color: #f8f5ee;
        border: 2px solid var(--accent-color);
        border-radius: 6px;
        padding: 12px 16px;
        margin-bottom: 10px;
        cursor: pointer;
        transition: all 0.3s ease;
      }
      
      .quiz-option:hover {
        background-color: #f0e9d9;
        transform: translateX(5px);
      }
      
      .quiz-option.correct {
        background-color: rgba(76, 175, 80, 0.2);
        border-color: var(--success-color);
      }
      
      .quiz-option.incorrect {
        background-color: rgba(244, 67, 54, 0.2);
        border-color: var(--error-color);
      }
      
      #feedback-correct, #feedback-incorrect {
        padding: 12px;
        border-radius: 6px;
        margin-top: 16px;
        font-weight: 500;
        display: none;
      }
      
      #feedback-correct {
        background-color: rgba(76, 175, 80, 0.2);
        color: #2e7d32;
        border: 1px solid #2e7d32;
      }
      
      #feedback-incorrect {
        background-color: rgba(244, 67, 54, 0.2);
        color: #c62828;
        border: 1px solid #c62828;
      }

      /* Buttons */
      button {
        background-color: var(--primary-color);
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 5px;
        cursor: pointer;
        font-family: inherit;
        transition: background-color 0.3s;
      }

      button:hover {
        background-color: var(--highlight-color);
      }

      /* Links */
      a {
        color: var(--secondary-color);
        text-decoration: none;
        border-bottom: 1px dashed var(--secondary-color);
      }

      a:hover {
        color: var(--primary-color);
        border-bottom: 1px solid var(--primary-color);
      }
    `,
    jsContent: `
      // Brown Markdown Style - Helper JavaScript functions
      document.addEventListener('DOMContentLoaded', function() {
        // Set up any collapsible sections
        const collapsibles = document.querySelectorAll('.collapsible');
        collapsibles.forEach(collapsible => {
          const header = collapsible.querySelector('.collapsible-header');
          const content = collapsible.querySelector('.collapsible-content');
          
          if (header && content) {
            content.style.display = 'none';
            header.addEventListener('click', () => {
              if (content.style.display === 'none') {
                content.style.display = 'block';
                header.classList.add('open');
              } else {
                content.style.display = 'none';
                header.classList.remove('open');
              }
            });
          }
        });
        
        // Initialize quiz functionality if it exists
        const quizOptions = document.querySelectorAll('.quiz-option');
        if (quizOptions.length > 0) {
          quizOptions.forEach(option => {
            option.addEventListener('click', () => {
              window.selectOption(option.getAttribute('data-option'));
            });
          });
        }
      });
    `
  };
};