import { useState, useEffect, useRef } from "react";
import { X, Terminal, Globe, Play, ArrowRight, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CodeConsoleProps {
  output: string[];
  onClose: () => void;
  testResults?: {
    id: string;
    name: string;
    passed: boolean;
    message?: string;
  }[];
}

export default function CodeConsole({ output, onClose, testResults = [] }: CodeConsoleProps) {
  const consoleRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLIFrameElement>(null);
  const [activeTab, setActiveTab] = useState<"console" | "preview">("console");
  const [previewHtml, setPreviewHtml] = useState("");

  // Auto-scroll to the bottom of console on new output
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [output]);

  // Generate HTML preview from the output
  useEffect(() => {
    if (activeTab === "preview") {
      try {
        const htmlContent = generateHtmlPreview(output);
        setPreviewHtml(htmlContent);
      } catch (error) {
        console.error("Failed to generate HTML preview:", error);
      }
    }
  }, [activeTab, output]);

  const generateHtmlPreview = (consoleOutput: string[]) => {
    // Extract any HTML content from the console output
    // This is a simple implementation - in a production app, 
    // you might want more sophisticated parsing
    const htmlRegex = /<html.*?>[\s\S]*?<\/html>/i;
    const bodyRegex = /<body.*?>[\s\S]*?<\/body>/i;
    
    const joinedOutput = consoleOutput.join('\n');
    
    // Check for complete HTML document
    const htmlMatch = joinedOutput.match(htmlRegex);
    if (htmlMatch) {
      return htmlMatch[0];
    }
    
    // Check for body content
    const bodyMatch = joinedOutput.match(bodyRegex);
    if (bodyMatch) {
      return `<!DOCTYPE html><html><head><meta charset="UTF-8" /><title>Preview</title></head>${bodyMatch[0]}</html>`;
    }
    
    // If no HTML was found, create a basic document with the output
    // Filter out obvious non-visual content
    const visualOutput = consoleOutput
      .filter(line => !line.startsWith('//') && !line.startsWith('Error:') && !line.startsWith('---'))
      .join('<br />');
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>Preview</title>
          <style>
            body { font-family: sans-serif; padding: 1rem; }
            .output { padding: 0.5rem; }
          </style>
        </head>
        <body>
          <div class="output">${visualOutput}</div>
        </body>
      </html>
    `;
  };

  const formatOutput = (text: string) => {
    if (text.startsWith('Error:')) {
      return <span className="text-red-400">{text}</span>;
    } else if (text.startsWith('✓')) {
      return <span className="text-green-400">{text}</span>;
    } else if (text.startsWith('✗')) {
      return <span className="text-red-400">{text}</span>;
    } else if (text.startsWith('---')) {
      return <span className="text-gray-400 font-semibold">{text}</span>;
    } else if (text.startsWith('//')) {
      return <span className="text-gray-500">{text}</span>;
    }
    return text;
  };

  return (
    <div className="w-2/5 bg-gray-800 border-l border-gray-700 flex flex-col animate-slide-in-right">
      <div className="bg-gray-900 border-b border-gray-700 p-2 flex items-center justify-between">
        <div className="flex space-x-1">
          <button 
            className={`px-3 py-1 rounded text-sm flex items-center ${
              activeTab === "console" 
                ? "bg-gray-700 text-white" 
                : "text-gray-400 hover:text-gray-200"
            }`}
            onClick={() => setActiveTab("console")}
          >
            <Terminal className="h-3 w-3 mr-1" />
            Console
          </button>
          <button 
            className={`px-3 py-1 rounded text-sm flex items-center ${
              activeTab === "preview" 
                ? "bg-gray-700 text-white" 
                : "text-gray-400 hover:text-gray-200"
            }`}
            onClick={() => setActiveTab("preview")}
          >
            <Globe className="h-3 w-3 mr-1" />
            Preview
          </button>
        </div>
        <button 
          className="text-gray-400 hover:text-gray-200"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      
      {activeTab === "console" && (
        <>
          <div 
            ref={consoleRef}
            className="flex-1 overflow-auto font-mono text-xs p-3 text-gray-300 border-b border-gray-700"
          >
            {output.length === 0 ? (
              <p className="text-gray-500">// Console output will appear here when you run your code</p>
            ) : (
              output.map((line, index) => (
                <div key={index} className="whitespace-pre-wrap mb-1">
                  {formatOutput(line)}
                </div>
              ))
            )}
          </div>
          
          {/* Test Results Summary */}
          {testResults.length > 0 && (
            <div className="bg-gray-900 p-3">
              <h3 className="text-gray-300 text-xs font-semibold mb-2">Test Results</h3>
              <div className="space-y-2">
                {testResults.map((result) => (
                  <div key={result.id} className="flex items-start bg-gray-800 rounded p-2">
                    <div className="mt-0.5 mr-2">
                      {result.passed ? (
                        <CheckCircle className="h-4 w-4 text-green-400" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`text-xs font-medium ${result.passed ? 'text-green-400' : 'text-red-400'}`}>
                        {result.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {result.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-3 flex items-center justify-between">
                <div className="text-xs text-gray-400">
                  {testResults.filter(r => r.passed).length} of {testResults.length} tests passing
                </div>
                {testResults.every(r => r.passed) && (
                  <div className="bg-green-900 text-green-300 text-xs px-2 py-1 rounded-full flex items-center">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    All tests passing!
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
      
      {activeTab === "preview" && (
        <div className="flex-1 bg-white">
          <iframe
            ref={previewRef}
            title="Code Preview"
            className="w-full h-full"
            srcDoc={previewHtml}
            sandbox="allow-scripts"
          />
        </div>
      )}
    </div>
  );
}
