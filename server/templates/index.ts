/**
 * Export all template styles from a single file
 */
export { generateBrownMarkdownStyle } from './brownMarkdown';
export { generateNeonRacerStyle } from './neonRacer';
export { generateInteractionGaloreStyle } from './interactionGalore';
export { generatePracticalProjectStyle } from './practicalProject';

/**
 * Generate the appropriate CSS and JS content based on the selected style template
 */
export const generateStyleTemplateForLesson = (style: string, topic: string): { cssContent: string, jsContent: string } => {
  const {
    generateBrownMarkdownStyle,
    generateNeonRacerStyle,
    generateInteractionGaloreStyle,
    generatePracticalProjectStyle
  } = require('./');
  
  switch(style) {
    case 'brown-markdown':
      return generateBrownMarkdownStyle(topic);
    case 'neon-racer':
      return generateNeonRacerStyle(topic);
    case 'interaction-galore':
      return generateInteractionGaloreStyle(topic);
    case 'practical-project':
      return generatePracticalProjectStyle(topic);
    default:
      // Default to Brown Markdown if no style is provided or recognized
      return generateBrownMarkdownStyle(topic);
  }
};