import { ReactNode } from "react";
import Navbar from "./Navbar";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Navbar />
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
