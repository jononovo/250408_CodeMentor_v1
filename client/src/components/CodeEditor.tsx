import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, Terminal, Save, FileText, Settings, X } from "lucide-react";
import CodeConsole from "./CodeConsole";
import { runCode } from "@/lib/codeRunner";
import { runTests, TestResult } from "@/lib/codeTests";

interface CodeEditorProps {
  initialCode?: string;
  filename?: string;
  tests?: { 
    id: string;
    name: string;
    description: string;
    validation: string;
    type: 'regex' | 'js';
  }[];
  onTestsComplete?: (results: TestResult[]) => void;
  onCodeChange?: (code: string) => void;
}

export default function CodeEditor({ 
  initialCode = "// Write your code here\n", 
  filename = "script.js",
  tests = [],
  onTestsComplete,
  onCodeChange
}: CodeEditorProps) {
  const [code, setCode] = useState(initialCode);
  const [showConsole, setShowConsole] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  // Update the parent component when code changes
  useEffect(() => {
    if (onCodeChange) {
      onCodeChange(code);
    }
  }, [code, onCodeChange]);

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCode(e.target.value);
  };

  const handleRunCode = async () => {
    setIsRunning(true);
    setShowConsole(true);
    setConsoleOutput(["// Running code..."]);
    
    // Check if code contains script tags and warn the user
    if (code.includes('<script>') || code.includes('</script>')) {
      setConsoleOutput(prev => [
        ...prev,
        "// Note: <script> tags detected. They will be automatically removed during execution.",
        "// The code will still run normally - this is just informational."
      ]);
    }
    
    // Check if code begins with language identifier
    if (/^(javascript|js)(\s|$)/.test(code.trim())) {
      setConsoleOutput(prev => [
        ...prev,
        "// Note: 'javascript' or 'js' language identifier detected at the beginning of the code.",
        "// This will be automatically removed during execution."
      ]);
    }
    
    try {
      // Run the code and capture console output
      const { output } = await runCode(
        code,
        (log) => setConsoleOutput(prev => [...prev, log]),
        (error) => setConsoleOutput(prev => [...prev, `Error: ${error}`])
      );
      
      // Run tests if provided
      if (tests.length > 0) {
        const results = await runTests(code, tests, output);
        setTestResults(results);
        
        // Add test results to console output
        const testOutput = results.map(result => 
          `${result.passed ? '✓' : '✗'} Test: ${result.name} - ${result.passed ? 'Passed!' : 'Failed'}`
        ).join('\n');
        
        setConsoleOutput(prev => [...prev, '\n--- Test Results ---', testOutput]);
        
        if (onTestsComplete) {
          onTestsComplete(results);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setConsoleOutput(prev => [...prev, `Error: ${errorMessage}`]);
    } finally {
      setIsRunning(false);
    }
  };

  const handleToggleConsole = () => {
    setShowConsole(!showConsole);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Editor Toolbar */}
      <div className="bg-gray-800 text-white py-2 px-4 flex items-center justify-between">
        <div className="flex items-center">
          <div className="mr-4">
            <span className="text-sm font-medium mr-2">File:</span>
            <span className="bg-gray-700 text-gray-200 px-2 py-1 rounded text-xs font-mono">
              {filename}
            </span>
          </div>
          <div className="flex space-x-1">
            <button className="hover:bg-gray-700 p-1.5 rounded">
              <FileText className="h-4 w-4 text-gray-300" />
            </button>
            <button className="hover:bg-gray-700 p-1.5 rounded">
              <Save className="h-4 w-4 text-gray-300" />
            </button>
            <button className="hover:bg-gray-700 p-1.5 rounded">
              <Settings className="h-4 w-4 text-gray-300" />
            </button>
          </div>
        </div>
        <div className="flex items-center">
          <Button 
            onClick={handleRunCode} 
            disabled={isRunning}
            className="bg-green-500 hover:bg-green-600 text-white py-1.5 px-4 rounded-md text-sm flex items-center font-medium"
          >
            <Play className="h-4 w-4 mr-1" />
            Run Code
          </Button>
          <Button 
            onClick={handleToggleConsole}
            variant="outline"
            className="ml-2 bg-gray-700 hover:bg-gray-600 text-white py-1.5 px-3 rounded-md text-sm flex items-center font-medium"
          >
            <Terminal className="h-4 w-4 mr-1" />
            Console
          </Button>
        </div>
      </div>

      {/* Editor and Console */}
      <div className="flex-1 flex overflow-hidden">
        {/* Code Editor */}
        <div className="flex-1 bg-gray-900 text-gray-100 overflow-hidden flex flex-col">
          <textarea
            ref={editorRef}
            value={code}
            onChange={handleCodeChange}
            className="overflow-auto flex-1 font-mono text-sm p-4 bg-gray-900 text-gray-100 resize-none outline-none w-full"
            spellCheck="false"
          />
        </div>

        {/* Console Output */}
        {showConsole && (
          <CodeConsole 
            output={consoleOutput} 
            onClose={() => setShowConsole(false)}
            testResults={testResults}
          />
        )}
      </div>
    </div>
  );
}
