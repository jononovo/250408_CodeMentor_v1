/**
 * Run JavaScript code safely and capture console output
 */
export const runCode = (
  code: string, 
  onConsoleLog: (log: string) => void, 
  onConsoleError: (error: string) => void
): Promise<{ output: string[], error: string | null }> => {
  return new Promise((resolve) => {
    const consoleOutputs: string[] = [];
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    
    // Override console.log
    console.log = (...args) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      
      consoleOutputs.push(message);
      onConsoleLog(message);
    };
    
    // Override console.error
    console.error = (...args) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      
      consoleOutputs.push(`Error: ${message}`);
      onConsoleError(message);
    };

    // Remove script tags and language identifiers from code if they exist
    let cleanedCode = code;
    
    // First remove script tags
    if (code.includes('<script>') || code.includes('</script>')) {
      cleanedCode = code
        .replace(/<script>/g, '')
        .replace(/<\/script>/g, '')
        .replace(/<script type="text\/javascript">/g, '')
        .replace(/<script language="javascript">/g, '');
      
      // Log what we're doing so the user understands
      console.log("Removing script tags before execution...");
    }
    
    // Then remove language identifiers that might be at the beginning of the code
    cleanedCode = cleanedCode.trim();
    if (/^(javascript|js)(\s|$)/.test(cleanedCode)) {
      // Remove the word 'javascript' or 'js' if it's the first word in the code
      cleanedCode = cleanedCode.replace(/^(javascript|js)(\s|$)/, '').trim();
      console.log("Removing language identifier before execution...");
    }
    
    // Execute the code in a try-catch block
    let error: string | null = null;
    try {
      // Using Function constructor to evaluate the code
      Function(cleanedCode)();
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      error = errorMessage;
      onConsoleError(errorMessage);
      consoleOutputs.push(`Error: ${errorMessage}`);
    } finally {
      // Restore the original console functions
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
      
      resolve({
        output: consoleOutputs,
        error
      });
    }
  });
};
