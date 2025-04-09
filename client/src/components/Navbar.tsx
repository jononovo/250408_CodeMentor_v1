import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Plus, Code } from "lucide-react";

export default function Navbar() {
  const [location] = useLocation();
  
  return (
    <nav className="bg-white shadow-sm z-10">
      <div className="max-w-full mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center mr-2">
                <Code className="h-5 w-5 text-white" />
              </div>
              <Link href="/">
                <span className="font-display font-bold text-xl text-gray-800 cursor-pointer">CodeMumu</span>
              </Link>
            </div>
            <div className="hidden md:ml-6 md:flex md:space-x-6">
              <Link href="/">
                <span className={`${location === '/' ? 'border-primary text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium cursor-pointer`}>
                  My Lessons
                </span>
              </Link>
              <a href="#" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                Explore
              </a>
              <a href="#" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                Community
              </a>
            </div>
          </div>
          <div className="flex items-center">
            <div className="ml-3 relative">
              <div>
                <button type="button" className="flex text-sm bg-gray-800 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500" id="user-menu-button">
                  <span className="sr-only">Open user menu</span>
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white">
                    <span>U</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
