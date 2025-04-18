export interface TestCase {
  id: string;
  name: string;
  description: string;
  validation: string; // Regex or JavaScript code to eval
  type: 'regex' | 'js';
}

export interface TestResult {
  id: string;
  name: string;
  passed: boolean;
  message?: string;
}

/**
 * Run tests against submitted code
 */
export const runTests = async (
  code: string,
  tests: TestCase[],
  consoleOutput: string[] = []
): Promise<TestResult[]> => {
  // Clean code of script tags and language identifiers for testing
  let cleanedCode = code;
  
  // First remove script tags
  if (code.includes('<script>') || code.includes('</script>')) {
    cleanedCode = code
      .replace(/<script>/g, '')
      .replace(/<\/script>/g, '')
      .replace(/<script type="text\/javascript">/g, '')
      .replace(/<script language="javascript">/g, '');
  }
  
  // Then remove language identifiers that might be at the beginning of the code
  cleanedCode = cleanedCode.trim();
  if (/^(javascript|js)(\s|$)/.test(cleanedCode)) {
    // Remove the word 'javascript' or 'js' if it's the first word in the code
    cleanedCode = cleanedCode.replace(/^(javascript|js)(\s|$)/, '').trim();
  }

  return tests.map((test) => {
    try {
      let passed = false;
      
      if (test.type === 'regex') {
        // Run regex validation against the cleaned code
        const regex = new RegExp(test.validation);
        passed = regex.test(cleanedCode);
      } else if (test.type === 'js') {
        // Create a function that evaluates the test validation code
        // This allows complex validation like checking console output
        const testFn = new Function('code', 'consoleOutput', test.validation);
        passed = testFn(cleanedCode, consoleOutput);
      }

      return {
        id: test.id,
        name: test.name,
        passed,
        message: passed ? 'Test passed!' : 'Test failed'
      };
    } catch (error) {
      return {
        id: test.id,
        name: test.name,
        passed: false,
        message: `Error running test: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  });
};

/**
 * Parse test definitions from a string
 * Format: Test name | Description | validation code or regex | type (regex or js)
 */
export const parseTests = (testDefinitions: string): TestCase[] => {
  if (!testDefinitions) return [];
  
  return testDefinitions.split('\n')
    .filter(line => line.trim())
    .map((line, index) => {
      const parts = line.split('|').map(part => part.trim());
      if (parts.length < 3) {
        return {
          id: `test-${index + 1}`,
          name: parts[0] || `Test ${index + 1}`,
          description: parts[1] || '',
          validation: parts[2] || '',
          type: parts[3] === 'js' ? 'js' : 'regex'
        };
      }
      
      return {
        id: `test-${index + 1}`,
        name: parts[0],
        description: parts[1],
        validation: parts[2],
        type: (parts[3] === 'js' ? 'js' : 'regex')
      };
    });
};

/**
 * Check if all tests have passed
 */
export const allTestsPassed = (results: TestResult[]): boolean => {
  return results.length > 0 && results.every(result => result.passed);
};
