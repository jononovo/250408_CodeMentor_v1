import { Tool } from "../openai";
import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const MODEL = "gpt-4o";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Tool definitions for code-related operations
 */
export const codeTools = {
  definitions: [
    {
      type: "function",
      function: {
        name: "analyzeCode",
        description: "Analyze code for errors, improvements, and best practices",
        parameters: {
          type: "object",
          properties: {
            code: {
              type: "string",
              description: "The code snippet to analyze"
            },
            language: {
              type: "string",
              description: "The programming language (javascript, python, html, css, etc.)"
            }
          },
          required: ["code", "language"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "explainCode",
        description: "Provide a line-by-line explanation of code for educational purposes",
        parameters: {
          type: "object",
          properties: {
            code: {
              type: "string",
              description: "The code snippet to explain"
            },
            language: {
              type: "string",
              description: "The programming language (javascript, python, html, css, etc.)"
            },
            audience: {
              type: "string",
              enum: ["beginner", "intermediate", "advanced"],
              description: "The target audience's experience level"
            }
          },
          required: ["code", "language"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "generateTests",
        description: "Generate test cases for a coding challenge or problem",
        parameters: {
          type: "object",
          properties: {
            description: {
              type: "string",
              description: "Description of the challenge or problem"
            },
            language: {
              type: "string",
              description: "The programming language (javascript, python, etc.)"
            },
            sampleCode: {
              type: "string",
              description: "Sample code or solution for the challenge (optional)"
            }
          },
          required: ["description", "language"]
        }
      }
    }
  ],
  functions: {
    /**
     * Analyze code for errors, improvements, and best practices
     */
    analyzeCode: async ({
      code,
      language
    }: {
      code: string;
      language: string;
    }) => {
      try {
        const prompt = `Analyze the following ${language} code for a teenage coding student:

\`\`\`${language}
${code}
\`\`\`

Please provide:
1. Error identification (if any)
2. Style and best practice recommendations
3. Potential optimizations
4. Explanation of complex parts that might be confusing to a teenager

Format your response in markdown with clear sections and examples.`;

        const response = await openai.chat.completions.create({
          model: MODEL,
          messages: [{ role: "user", content: prompt }],
        });

        return {
          status: "success",
          analysis: response.choices[0].message.content,
        };
      } catch (error) {
        console.error("Error analyzing code:", error);
        return {
          status: "error",
          message: `Failed to analyze code: ${error.message}`
        };
      }
    },
    
    /**
     * Provide a line-by-line explanation of code
     */
    explainCode: async ({
      code,
      language,
      audience = "beginner"
    }: {
      code: string;
      language: string;
      audience?: "beginner" | "intermediate" | "advanced";
    }) => {
      try {
        const prompt = `Explain the following ${language} code line by line for a ${audience}-level teenage student:

\`\`\`${language}
${code}
\`\`\`

Please:
1. Break down the code into logical sections
2. Explain each line or block in simple terms appropriate for a ${audience} student
3. Highlight important concepts and patterns
4. Use analogies when helpful
5. Format your explanation with markdown for readability

Make sure your explanation is engaging and educational for a teenage audience.`;

        const response = await openai.chat.completions.create({
          model: MODEL,
          messages: [{ role: "user", content: prompt }],
        });

        return {
          status: "success",
          explanation: response.choices[0].message.content,
        };
      } catch (error) {
        console.error("Error explaining code:", error);
        return {
          status: "error",
          message: `Failed to explain code: ${error.message}`
        };
      }
    },
    
    /**
     * Generate test cases for a coding challenge
     */
    generateTests: async ({
      description,
      language,
      sampleCode
    }: {
      description: string;
      language: string;
      sampleCode?: string;
    }) => {
      try {
        const prompt = `Generate test cases for the following coding challenge:

Description: ${description}

${sampleCode ? `Sample code:
\`\`\`${language}
${sampleCode}
\`\`\`` : ""}

Create test cases suitable for a teenage coding student's challenge. For each test:
1. Provide a descriptive name
2. Explain what the test is checking
3. Include validation code that can be used to automatically verify the solution
4. Make the tests progressively more challenging

Format the response as a JSON array with this structure:
[
  {
    "id": "unique-test-id",
    "name": "Test name",
    "description": "What this test checks",
    "validation": "Validation code or regex",
    "type": "js" or "regex"
  }
]

Include at least 3 tests, but no more than 5.`;

        const response = await openai.chat.completions.create({
          model: MODEL,
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
        });

        const content = response.choices[0].message.content;
        if (!content) {
          throw new Error("Empty response from OpenAI");
        }

        try {
          const testsData = JSON.parse(content);
          return {
            status: "success",
            tests: Array.isArray(testsData) ? testsData : testsData.tests || []
          };
        } catch (error) {
          console.error("Error parsing tests JSON:", error);
          return {
            status: "error",
            message: "Failed to parse test data from AI response"
          };
        }
      } catch (error) {
        console.error("Error generating tests:", error);
        return {
          status: "error",
          message: `Failed to generate tests: ${error.message}`
        };
      }
    }
  }
};