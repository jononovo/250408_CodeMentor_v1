import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import ChatPanel from "@/components/ChatPanel";
import { BookOpen, Code, Send, Loader2 } from "lucide-react";

export default function NewLesson() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("beginner");
  const [description, setDescription] = useState("");
  const [format, setFormat] = useState("markdown");
  const [generating, setGenerating] = useState(false);

  // Create a new lesson
  const createLessonMutation = useMutation({
    mutationFn: async (data: { topic: string; difficulty: string; description: string; format: string }) => {
      const response = await apiRequest("POST", "/api/lessons", data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/lessons"] });
      toast({
        title: "Lesson created!",
        description: "Your new coding lesson has been created successfully.",
        variant: "success",
      });
      navigate(`/lesson/${data.id}`);
    },
    onError: (error) => {
      toast({
        title: "Error creating lesson",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic) {
      toast({
        title: "Topic required",
        description: "Please provide a topic for your lesson",
        variant: "destructive",
      });
      return;
    }
    
    setGenerating(true);
    createLessonMutation.mutate({ topic, difficulty, description, format });
  };

  const handleNewLesson = (title: string) => {
    if (title) {
      setTopic(title);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl px-4">
      <div className="flex items-center mb-6">
        <BookOpen className="h-6 w-6 text-primary mr-2" />
        <h1 className="text-2xl font-display font-bold">Create a New Coding Lesson</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <h2 className="text-xl font-semibold">Lesson Details</h2>
            <p className="text-sm text-gray-500">
              Provide some information about the lesson you want to create
            </p>
          </CardHeader>
          <CardContent>
            <form id="lesson-form" onSubmit={handleSubmit}>
              <div className="mb-4">
                <Label htmlFor="topic">Topic</Label>
                <Input
                  id="topic"
                  placeholder="e.g. JavaScript Functions, Python Lists, HTML Basics"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div className="mb-4">
                <Label htmlFor="difficulty">Difficulty Level</Label>
                <div className="flex mt-1 space-x-2">
                  {["beginner", "intermediate", "advanced"].map((level) => (
                    <Button
                      key={level}
                      type="button"
                      variant={difficulty === level ? "default" : "outline"}
                      onClick={() => setDifficulty(level)}
                      className="flex-1 capitalize"
                    >
                      {level}
                    </Button>
                  ))}
                </div>
              </div>
              
              <div className="mb-4">
                <Label htmlFor="format">Lesson Format</Label>
                <div className="flex mt-1 space-x-2">
                  <Button
                    type="button"
                    variant={format === "markdown" ? "default" : "outline"}
                    onClick={() => setFormat("markdown")}
                    className="flex-1"
                  >
                    Markdown
                  </Button>
                  <Button
                    type="button"
                    variant={format === "html" ? "default" : "outline"}
                    onClick={() => setFormat("html")}
                    className="flex-1"
                  >
                    HTML/CSS/JS
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {format === "html" 
                    ? "HTML format allows for more interactive slides with custom CSS and JavaScript" 
                    : "Markdown format is simpler with automatic formatting for code blocks and sections"}
                </p>
              </div>
              
              <div className="mb-4">
                <Label htmlFor="description">Additional Details (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Any specific topics, examples, or focus areas you'd like to include..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1"
                  rows={4}
                />
              </div>
            </form>
          </CardContent>
          <CardFooter className="border-t pt-4">
            <Button
              type="submit"
              form="lesson-form"
              className="w-full bg-primary hover:bg-primary/90"
              disabled={createLessonMutation.isPending || generating}
            >
              {createLessonMutation.isPending || generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating Lesson...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Generate Lesson
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <h2 className="text-xl font-semibold">Chat with Mumu</h2>
            <p className="text-sm text-gray-500">
              Ask Mumu to help you create a lesson or get suggestions
            </p>
          </CardHeader>
          <CardContent className="h-[350px] relative">
            <div className="absolute inset-0 p-4 bg-gray-50 rounded-md flex items-center justify-center">
              <div className="text-center">
                <Code className="h-10 w-10 text-primary mx-auto mb-3" />
                <h3 className="font-semibold text-lg mb-1">Let Mumu help you!</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Chat with Mumu to get ideas for your coding lesson or ask for suggestions.
                </p>
                <p className="text-xs text-gray-400">
                  Example: "Create a beginner JavaScript lesson about loops" or "Help me plan a Python data types tutorial"
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <ChatPanel onNewLesson={handleNewLesson} />
    </div>
  );
}
