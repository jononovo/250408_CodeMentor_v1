import { useLocation } from "wouter";
import ChatPanel from "@/components/ChatPanel";
import { BookOpen, MessageCircle } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function NewLesson() {
  const [, navigate] = useLocation();

  const handleNewLesson = (title: string) => {
    // The navigation will be handled by the ChatPanel component
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl px-4">
      <div className="flex items-center mb-6">
        <BookOpen className="h-6 w-6 text-primary mr-2" />
        <h1 className="text-2xl font-display font-bold">Create a New Coding Lesson</h1>
      </div>
      
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <div className="flex items-center">
            <MessageCircle className="h-5 w-5 text-primary mr-2" />
            <h2 className="text-xl font-semibold">Ask Mumu to Create a Lesson</h2>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Chat with Mumu to create interactive coding lessons with rich HTML content
          </p>
        </CardHeader>
        <CardContent>
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-md">
            <h3 className="font-medium text-blue-800 mb-1">Example Prompts:</h3>
            <ul className="list-disc pl-5 text-blue-700 space-y-1">
              <li>"Create a beginner JavaScript lesson about variables"</li>
              <li>"Make a colorful, interactive HTML lesson about CSS flexbox"</li>
              <li>"Generate an advanced Python lesson on data structures"</li>
              <li>"I need a lesson that explains web APIs with interactive examples"</li>
            </ul>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <p>All lessons are now created in HTML format by default for a richer, more interactive experience. Lessons include:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Colorful, styled content with modern design</li>
              <li>Interactive elements like expandable sections and tabs</li>
              <li>Code examples with syntax highlighting</li>
              <li>Practical coding challenges with real-time feedback</li>
            </ul>
          </div>
        </CardContent>
      </Card>
      
      <ChatPanel onNewLesson={handleNewLesson} />
    </div>
  );
}
