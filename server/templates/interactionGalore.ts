/**
 * Interaction Galore 💃🏽: A style focused on interactive elements with plenty of clickable components
 */
export const generateInteractionGaloreStyle = (topic: string): { cssContent: string, jsContent: string } => {
  return {
    cssContent: `
      /* Interaction Galore Style - Highly interactive theme */
      :root {
        --primary-color: #4285F4;
        --secondary-color: #34A853;
        --tertiary-color: #FBBC05;
        --quaternary-color: #EA4335;
        --background-color: #FFFFFF;
        --panel-bg: #F8F9FA;
        --text-color: #202124;
        --text-secondary: #5F6368;
        --border-color: #DADCE0;
        --shadow-color: rgba(60, 64, 67, 0.15);
        --success-color: #34A853;
        --error-color: #EA4335;
      }

      body, html {
        font-family: 'Roboto', 'Segoe UI', sans-serif;
        color: var(--text-color);
        background-color: var(--background-color);
        line-height: 1.6;
        max-width: 100%;
        margin: 0;
        padding: 0;
      }

      h1, h2, h3, h4, h5 {
        font-family: 'Google Sans', 'Roboto', sans-serif;
        color: var(--primary-color);
        margin-bottom: 1rem;
        padding-left: 0;
        padding-right: 0;
      }

      /* Interactive Panels */
      .panel {
        background-color: var(--panel-bg);
        border-radius: 8px;
        box-shadow: 0 2px 6px var(--shadow-color);
        padding: 1.5rem;
        margin: 1.5rem 0;
        transition: transform 0.3s, box-shadow 0.3s;
      }

      .panel:hover {
        transform: translateY(-5px);
        box-shadow: 0 4px 12px var(--shadow-color);
      }

      /* Tabs System */
      .tabs-container {
        border-bottom: 1px solid var(--border-color);
        margin-bottom: 1.5rem;
      }

      .tab-buttons {
        display: flex;
        gap: 0.5rem;
        overflow-x: auto;
        padding-bottom: 0.5rem;
      }

      .tab-btn {
        background: none;
        border: none;
        padding: 0.75rem 1.25rem;
        border-radius: 20px;
        cursor: pointer;
        font-weight: 500;
        color: var(--text-secondary);
        position: relative;
        transition: color 0.3s;
      }

      .tab-btn.active {
        color: var(--primary-color);
        background-color: rgba(66, 133, 244, 0.1);
      }

      .tab-content {
        display: none;
        padding: 1rem 0;
      }

      .tab-content.active {
        display: block;
        animation: fadeIn 0.3s;
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      /* Accordions */
      .accordion {
        border: 1px solid var(--border-color);
        border-radius: 8px;
        margin-bottom: 1rem;
        overflow: hidden;
      }

      .accordion-header {
        padding: 1rem;
        background-color: var(--panel-bg);
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-weight: 500;
      }

      .accordion-content {
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.3s ease-out;
        background-color: var(--background-color);
        padding: 0 1rem;
      }

      .accordion.open .accordion-content {
        max-height: 500px;
        padding: 1rem;
      }

      .accordion-icon {
        transition: transform 0.3s;
      }

      .accordion.open .accordion-icon {
        transform: rotate(180deg);
      }
      
      /* Code blocks */
      pre {
        background-color: var(--panel-bg);
        padding: 1rem 0.5rem;
        border-radius: 8px;
        border: 1px solid var(--border-color);
        overflow-x: auto;
        position: relative;
        max-width: 100%;
        margin-left: 0;
        margin-right: 0;
      }
      
      code {
        font-family: 'Roboto Mono', monospace;
        font-size: 0.9em;
      }

      /* Cards */
      .cards-container {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        gap: 1rem;
      }

      .card {
        background-color: var(--panel-bg);
        border-radius: 8px;
        border: 1px solid var(--border-color);
        overflow: hidden;
        transition: transform 0.3s, box-shadow 0.3s;
      }

      .card:hover {
        transform: translateY(-5px);
        box-shadow: 0 4px 12px var(--shadow-color);
      }

      .card-header {
        padding: 1rem;
        background-color: var(--primary-color);
        color: white;
        font-weight: 500;
      }

      .card-body {
        padding: 1rem;
      }

      .card-footer {
        padding: 1rem;
        border-top: 1px solid var(--border-color);
        display: flex;
        justify-content: flex-end;
      }

      /* Quiz elements */
      .quiz-container {
        background-color: var(--panel-bg);
        border-radius: 12px;
        padding: 1.5rem;
        margin: 2rem 0;
        box-shadow: 0 4px 12px var(--shadow-color);
      }
      
      .quiz-option {
        display: flex;
        align-items: center;
        background-color: white;
        border: 2px solid var(--border-color);
        border-radius: 8px;
        padding: 12px 16px;
        margin-bottom: 12px;
        cursor: pointer;
        transition: all 0.2s ease;
        position: relative;
      }
      
      .quiz-option::before {
        content: '';
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 2px solid var(--border-color);
        margin-right: 12px;
        transition: all 0.2s ease;
      }
      
      .quiz-option:hover {
        border-color: var(--primary-color);
        transform: translateX(5px);
      }
      
      .quiz-option:hover::before {
        border-color: var(--primary-color);
      }
      
      .quiz-option.correct {
        background-color: rgba(52, 168, 83, 0.1);
        border-color: var(--success-color);
      }
      
      .quiz-option.correct::before {
        background-color: var(--success-color);
        border-color: var(--success-color);
      }
      
      .quiz-option.incorrect {
        background-color: rgba(234, 67, 53, 0.1);
        border-color: var(--error-color);
      }
      
      .quiz-option.incorrect::before {
        border-color: var(--error-color);
      }
      
      #feedback-correct, #feedback-incorrect {
        display: none;
        padding: 16px;
        border-radius: 8px;
        margin-top: 16px;
        font-weight: 500;
        align-items: center;
      }
      
      #feedback-correct {
        background-color: rgba(52, 168, 83, 0.1);
        color: var(--success-color);
        border: 1px solid var(--success-color);
      }
      
      #feedback-incorrect {
        background-color: rgba(234, 67, 53, 0.1);
        color: var(--error-color);
        border: 1px solid var(--error-color);
      }
      
      #feedback-correct::before, #feedback-incorrect::before {
        content: '';
        width: 20px;
        height: 20px;
        margin-right: 12px;
        background-size: contain;
        background-repeat: no-repeat;
      }
      
      #feedback-correct::before {
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2334A853'%3E%3Cpath d='M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z'/%3E%3C/svg%3E");
      }
      
      #feedback-incorrect::before {
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23EA4335'%3E%3Cpath d='M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z'/%3E%3C/svg%3E");
      }

      /* Buttons */
      button {
        background-color: var(--primary-color);
        color: white;
        border: none;
        border-radius: 4px;
        padding: 0.5rem 1rem;
        font-family: inherit;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.3s;
      }

      button:hover {
        background-color: #3367D6;
      }

      button.secondary {
        background-color: transparent;
        color: var(--primary-color);
        border: 1px solid var(--primary-color);
      }

      button.secondary:hover {
        background-color: rgba(66, 133, 244, 0.1);
      }

      /* Toggle Switch */
      .toggle-switch {
        position: relative;
        display: inline-block;
        width: 40px;
        height: 20px;
        margin: 0 10px;
      }

      .toggle-switch input {
        opacity: 0;
        width: 0;
        height: 0;
      }

      .slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: #ccc;
        transition: .4s;
        border-radius: 20px;
      }

      .slider:before {
        position: absolute;
        content: "";
        height: 16px;
        width: 16px;
        left: 3px;
        bottom: 2px;
        background-color: white;
        transition: .4s;
        border-radius: 50%;
      }

      input:checked + .slider {
        background-color: var(--primary-color);
      }

      input:checked + .slider:before {
        transform: translateX(18px);
      }

      /* Tooltips */
      .tooltip {
        position: relative;
        display: inline-block;
        cursor: help;
      }

      .tooltip .tooltip-text {
        visibility: hidden;
        width: 200px;
        background-color: var(--text-color);
        color: #fff;
        text-align: center;
        border-radius: 6px;
        padding: 8px;
        position: absolute;
        z-index: 1;
        bottom: 125%;
        left: 50%;
        transform: translateX(-50%);
        opacity: 0;
        transition: opacity 0.3s;
      }

      .tooltip:hover .tooltip-text {
        visibility: visible;
        opacity: 1;
      }

      /* Progress Indicators */
      .progress-bar {
        width: 100%;
        height: 8px;
        background-color: #E0E0E0;
        border-radius: 4px;
        overflow: hidden;
        margin: 1rem 0;
      }

      .progress-value {
        height: 100%;
        background-color: var(--primary-color);
        width: 0;
        transition: width 1s ease;
        border-radius: 4px;
      }
    `,
    jsContent: `
      // Interaction Galore Style - Helper JavaScript functions
      document.addEventListener('DOMContentLoaded', function() {
        // Tab system
        const initTabs = () => {
          const tabBtns = document.querySelectorAll('.tab-btn');
          tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
              window.showTab(e, btn.dataset.tab);
            });
          });

          // Initialize first tab
          if (tabBtns.length > 0) {
            const firstBtn = tabBtns[0];
            firstBtn.click();
          }
        };

        // Accordion system
        const initAccordions = () => {
          const accordions = document.querySelectorAll('.accordion');
          accordions.forEach(accordion => {
            const header = accordion.querySelector('.accordion-header');
            header.addEventListener('click', () => {
              accordion.classList.toggle('open');
            });
          });
        };

        // Progress bars
        const initProgressBars = () => {
          const progressBars = document.querySelectorAll('.progress-bar');
          progressBars.forEach(bar => {
            const value = bar.dataset.value || 0;
            const progressValue = bar.querySelector('.progress-value');
            setTimeout(() => {
              progressValue.style.width = \`\${value}%\`;
            }, 500);
          });
        };

        // Initialize interactive elements
        initTabs();
        initAccordions();
        initProgressBars();

        // Custom input elements
        const rangeInputs = document.querySelectorAll('input[type="range"]');
        rangeInputs.forEach(input => {
          const output = document.createElement('output');
          output.for = input.id;
          output.style.marginLeft = '10px';
          output.textContent = input.value;
          
          input.parentNode.insertBefore(output, input.nextSibling);
          
          input.addEventListener('input', () => {
            output.textContent = input.value;
          });
        });

        // Animation for elements as they enter viewport
        const observeElements = () => {
          const observerOptions = {
            root: null,
            rootMargin: '0px',
            threshold: 0.1
          };

          const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
              if (entry.isIntersecting) {
                entry.target.classList.add('animated');
                observer.unobserve(entry.target);
              }
            });
          }, observerOptions);

          const elements = document.querySelectorAll('.panel, .card, .accordion');
          elements.forEach(el => {
            observer.observe(el);
          });
        };

        observeElements();
        
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