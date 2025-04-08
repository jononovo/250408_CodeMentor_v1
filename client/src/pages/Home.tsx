import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, BookOpen, Clock, ArrowRight, Plus } from "lucide-react";

export default function Home() {
  const { data: lessons, isLoading } = useQuery({
    queryKey: ["/api/lessons"],
  });

  return (
    <div className="container mx-auto py-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold text-gray-900">My Coding Lessons</h1>
        <Link href="/new-lesson">
          <Button className="bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" />
            New Lesson
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-0">
                <div className="h-40 bg-gray-200 rounded-t-lg"></div>
                <div className="p-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : lessons && lessons.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lessons.map((lesson: any) => (
            <Card key={lesson.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-0">
                <div className="h-40 bg-gradient-to-r from-primary-100 to-secondary-100 rounded-t-lg flex items-center justify-center">
                  <BookOpen className="h-12 w-12 text-primary" />
                </div>
                <div className="p-4">
                  <h2 className="font-display font-bold text-lg">{lesson.title}</h2>
                  <p className="text-gray-500 text-sm line-clamp-2 mt-1">{lesson.description}</p>
                  
                  <div className="flex items-center mt-3 text-sm text-gray-500">
                    <div className="flex items-center mr-3">
                      <Play className="h-4 w-4 mr-1 text-green-500" />
                      <span>{lesson.totalSlides || 0} slides</span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1 text-blue-500" />
                      <span>{lesson.estimatedTime || '15 min'}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t p-4">
                <Link href={`/lesson/${lesson.id}`} className="w-full">
                  <Button variant="outline" className="w-full border-primary text-primary hover:bg-primary hover:text-white">
                    Continue
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No lessons yet</h3>
          <p className="text-gray-500 mb-4">
            You haven't created any coding lessons yet. Start your learning journey by creating one!
          </p>
          <Link href="/new-lesson">
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Lesson
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
