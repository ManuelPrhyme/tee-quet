import { useState, useEffect } from "react";
import { Toaster } from "sonner";
import { Header } from "./components/Header";
import { HomePage } from "./pages/HomePage";
import { CreatePage } from "./pages/CreatePage";
import { EventDetailPage } from "./pages/EventDetailPage";

function getPath() {
  return window.location.pathname;
}

export default function App() {
  const [path, setPath] = useState(getPath);

  useEffect(() => {
    const onPop = () => setPath(getPath());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Intercept <a> clicks for SPA navigation
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;
      const href = target.getAttribute("href");
      if (!href || href.startsWith("http") || href.startsWith("#")) return;
      e.preventDefault();
      window.history.pushState(null, "", href);
      setPath(href);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const eventMatch = path.match(/^\/events\/([^/]+)$/);

  function renderPage() {
    if (path === "/") return <HomePage navigate={navigate} />;
    if (path === "/create") return <CreatePage navigate={navigate} />;
    if (eventMatch) return <EventDetailPage eventId={eventMatch[1]} navigate={navigate} />;
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-7xl font-bold">404</h1>
          <p className="mt-4 text-muted-foreground">Page not found</p>
          <a href="/" className="mt-6 inline-block text-accent underline">Go home</a>
        </div>
      </div>
    );
  }

  function navigate(to: string) {
    window.history.pushState(null, "", to);
    setPath(to);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{renderPage()}</main>
      <Toaster position="top-right" richColors />
    </div>
  );
}
