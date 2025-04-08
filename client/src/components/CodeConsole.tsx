import { useEffect, useRef } from "react";
import { X } from "lucide-react";

interface CodeConsoleProps {
  output: string[];
  onClose: () => void;
}

export default function CodeConsole({ output, onClose }: CodeConsoleProps) {
  const consoleRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom of console on new output
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [output]);

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
        <span className="text-gray-300 text-sm font-medium">Console Output</span>
        <button 
          className="text-gray-400 hover:text-gray-200"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div 
        ref={consoleRef}
        className="flex-1 overflow-auto font-mono text-xs p-3 text-gray-300"
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
    </div>
  );
}
