/**
 * Neon Racer 🏎️: A vibrant, high-energy style with neon colors and animations
 */
export const generateNeonRacerStyle = (topic: string): { cssContent: string, jsContent: string } => {
  return {
    cssContent: `
      /* Neon Racer Style - Vibrant, high-energy theme */
      :root {
        --primary-color: #FF00FF;
        --secondary-color: #00FFFF;
        --background-color: #0F0F1A;
        --text-color: #F0F0F0;
        --accent-color: #FF00AA;
        --highlight-color: #00FF00;
        --code-bg: #1A1A2E;
        --info-bg: #1E1E3A;
        --warning-bg: #3A1E1E;
        --success-color: #00FF00;
        --error-color: #FF3333;
      }

      @keyframes neon-glow {
        0% { text-shadow: 0 0 5px var(--primary-color), 0 0 10px var(--primary-color); }
        50% { text-shadow: 0 0 10px var(--primary-color), 0 0 20px var(--primary-color), 0 0 30px var(--primary-color); }
        100% { text-shadow: 0 0 5px var(--primary-color), 0 0 10px var(--primary-color); }
      }

      @keyframes border-pulse {
        0% { border-color: var(--primary-color); }
        50% { border-color: var(--secondary-color); }
        100% { border-color: var(--primary-color); }
      }

      body, html {
        font-family: 'Orbitron', 'Tahoma', sans-serif;
        color: var(--text-color);
        background-color: var(--background-color);
        line-height: 1.6;
        max-width: 100%;
        margin: 0;
        padding: 0;
        background-image: 
          linear-gradient(rgba(15, 15, 26, 0.8), rgba(15, 15, 26, 0.8)),
          repeating-linear-gradient(90deg, rgba(255, 0, 255, 0.05) 0px, rgba(255, 0, 255, 0.05) 1px, transparent 1px, transparent 50px),
          repeating-linear-gradient(0deg, rgba(0, 255, 255, 0.05) 0px, rgba(0, 255, 255, 0.05) 1px, transparent 1px, transparent 50px);
      }

      h1, h2, h3, h4, h5 {
        font-family: 'Orbitron', 'Impact', sans-serif;
        color: var(--primary-color);
        animation: neon-glow 2s ease-in-out infinite;
        margin-bottom: 1.5rem;
        position: relative;
        display: inline-block;
        padding-left: 0;
        padding-right: 0;
      }

      h1::after, h2::after {
        content: '';
        position: absolute;
        bottom: -10px;
        left: 0;
        width: 100%;
        height: 2px;
        background: linear-gradient(90deg, var(--primary-color), var(--secondary-color), var(--primary-color));
        animation: border-pulse 2s infinite;
      }

      code {
        font-family: 'Courier New', monospace;
        background-color: var(--code-bg);
        color: var(--highlight-color);
        padding: 0.2rem 0.4rem;
        border-radius: 3px;
        font-size: 0.9em;
        border: 1px solid var(--secondary-color);
      }

      pre {
        background-color: var(--code-bg);
        padding: 1rem 0.5rem;
        border-radius: 5px;
        border: 1px solid var(--secondary-color);
        overflow-x: auto;
        position: relative;
        max-width: 100%;
        margin-left: 0;
        margin-right: 0;
      }

      pre::before {
        content: 'CODE';
        position: absolute;
        top: -10px;
        right: 10px;
        background-color: var(--background-color);
        color: var(--secondary-color);
        padding: 0 8px;
        font-size: 0.8em;
        border-radius: 10px;
        border: 1px solid var(--secondary-color);
      }

      /* Special elements */
      .info-box {
        background-color: var(--info-bg);
        border: 1px solid var(--secondary-color);
        box-shadow: 0 0 10px var(--secondary-color);
        padding: 1rem;
        margin: 1rem 0;
        border-radius: 5px;
      }

      .warning-box {
        background-color: var(--warning-bg);
        border: 1px solid var(--accent-color);
        box-shadow: 0 0 10px var(--accent-color);
        padding: 1rem;
        margin: 1rem 0;
        border-radius: 5px;
      }

      /* Quiz elements */
      .quiz-container {
        background-color: var(--info-bg);
        border: 2px solid var(--accent-color);
        border-radius: 12px;
        padding: 1.5rem;
        margin: 2rem 0;
        position: relative;
        overflow: hidden;
      }
      
      .quiz-container::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: linear-gradient(90deg, var(--primary-color), var(--secondary-color), var(--primary-color));
        animation: border-pulse 2s infinite;
      }
      
      .quiz-option {
        display: block;
        background-color: rgba(30, 30, 58, 0.6);
        border: 2px solid var(--primary-color);
        border-radius: 50px;
        padding: 12px 24px;
        margin-bottom: 12px;
        cursor: pointer;
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
        z-index: 1;
      }
      
      .quiz-option::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 0%;
        height: 100%;
        background: linear-gradient(90deg, var(--primary-color), transparent);
        transition: width 0.4s ease;
        opacity: 0.2;
        z-index: -1;
      }
      
      .quiz-option:hover {
        transform: translateX(10px);
      }
      
      .quiz-option:hover::before {
        width: 100%;
      }
      
      .quiz-option.correct {
        background-color: rgba(0, 255, 0, 0.2);
        border-color: var(--success-color);
        box-shadow: 0 0 15px var(--success-color);
      }
      
      .quiz-option.incorrect {
        background-color: rgba(255, 0, 0, 0.2);
        border-color: var(--error-color);
        box-shadow: 0 0 15px var(--error-color);
      }
      
      #feedback-correct, #feedback-incorrect {
        padding: 15px;
        border-radius: 10px;
        margin-top: 20px;
        font-weight: 500;
        display: none;
        animation: neon-glow 2s ease-in-out infinite;
      }
      
      #feedback-correct {
        background-color: rgba(0, 255, 0, 0.1);
        color: var(--success-color);
        border: 2px solid var(--success-color);
      }
      
      #feedback-incorrect {
        background-color: rgba(255, 0, 0, 0.1);
        color: var(--error-color);
        border: 2px solid var(--error-color);
      }

      /* Buttons */
      button {
        background-color: transparent;
        color: var(--primary-color);
        border: 2px solid var(--primary-color);
        padding: 0.5rem 1.5rem;
        border-radius: 50px;
        cursor: pointer;
        font-family: 'Orbitron', sans-serif;
        text-transform: uppercase;
        letter-spacing: 1px;
        position: relative;
        overflow: hidden;
        z-index: 1;
        transition: color 0.3s;
      }

      button::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 0;
        height: 100%;
        background-color: var(--primary-color);
        z-index: -1;
        transition: width 0.3s;
      }

      button:hover {
        color: var(--background-color);
      }

      button:hover::before {
        width: 100%;
      }

      /* Progress bar */
      .progress-container {
        width: 100%;
        height: 10px;
        background-color: var(--code-bg);
        border-radius: 5px;
        margin: 1rem 0;
        overflow: hidden;
      }

      .progress-bar {
        height: 100%;
        background: linear-gradient(90deg, var(--primary-color), var(--secondary-color));
        border-radius: 5px;
        transition: width 0.5s;
      }
    `,
    jsContent: `
      // Neon Racer Style - Helper JavaScript functions
      document.addEventListener('DOMContentLoaded', function() {
        // Add particle background
        const createParticles = () => {
          const container = document.createElement('div');
          container.className = 'particles-container';
          container.style.position = 'fixed';
          container.style.top = '0';
          container.style.left = '0';
          container.style.width = '100%';
          container.style.height = '100%';
          container.style.pointerEvents = 'none';
          container.style.zIndex = '-1';
          document.body.appendChild(container);
          
          for (let i = 0; i < 50; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.position = 'absolute';
            particle.style.width = Math.random() * 3 + 1 + 'px';
            particle.style.height = particle.style.width;
            particle.style.backgroundColor = Math.random() > 0.5 ? '#FF00FF' : '#00FFFF';
            particle.style.borderRadius = '50%';
            particle.style.opacity = Math.random() * 0.5 + 0.2;
            
            // Random starting positions
            particle.style.top = Math.random() * 100 + 'vh';
            particle.style.left = Math.random() * 100 + 'vw';
            
            // Add animation
            particle.style.animation = \`float \${Math.random() * 10 + 10}s linear infinite\`;
            particle.style.animationDelay = \`-\${Math.random() * 10}s\`;
            
            container.appendChild(particle);
          }
          
          // Add the float animation
          const style = document.createElement('style');
          style.innerHTML = \`
            @keyframes float {
              0% { transform: translateY(0); }
              100% { transform: translateY(-100vh); }
            }
          \`;
          document.head.appendChild(style);
        };
        
        createParticles();
        
        // Add click effects
        document.addEventListener('click', (e) => {
          const ripple = document.createElement('div');
          ripple.className = 'click-ripple';
          ripple.style.position = 'fixed';
          ripple.style.width = '10px';
          ripple.style.height = '10px';
          ripple.style.borderRadius = '50%';
          ripple.style.background = 'radial-gradient(circle, #FF00FF 0%, transparent 70%)';
          ripple.style.top = e.clientY + 'px';
          ripple.style.left = e.clientX + 'px';
          ripple.style.transform = 'translate(-50%, -50%)';
          ripple.style.animation = 'ripple-effect 1s ease-out forwards';
          
          document.body.appendChild(ripple);
          
          setTimeout(() => {
            ripple.remove();
          }, 1000);
        });
        
        // Add ripple effect animation
        const rippleStyle = document.createElement('style');
        rippleStyle.innerHTML = \`
          @keyframes ripple-effect {
            0% { width: 0px; height: 0px; opacity: 1; }
            100% { width: 100px; height: 100px; opacity: 0; }
          }
        \`;
        document.head.appendChild(rippleStyle);
        
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