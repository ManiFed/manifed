import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { UniversalHeader } from "@/components/layout/UniversalHeader";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background">
      <UniversalHeader />
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <h1 className="mb-4 text-4xl font-bold text-foreground">404</h1>
          <p className="mb-4 text-xl text-muted-foreground max-w-md">
            Not found, guess that wasn't one of our priors. Make a market about whether we'll fix this bug, why don't ya?
            Show it to us for one month comp.
          </p>
          <a href="/hub" className="text-primary underline hover:text-primary/90">
            Return to Hub
          </a>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
