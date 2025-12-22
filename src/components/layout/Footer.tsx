import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="border-t border-border/50 mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img alt="ManiFed" className="w-8 h-8 rounded-full" src="/lovable-uploads/b88a4827-379b-4e6a-afc5-6d0dd09697a8.png" />
            <span className="font-semibold text-foreground">ManiFed</span>
            <span className="text-muted-foreground">- Manifold's Central Bank</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
            <Link to="/terms" className="text-muted-foreground hover:text-primary transition-colors">
              Terms of Service
            </Link>
            <span className="text-muted-foreground/50">•</span>
            <Link to="/privacy" className="text-muted-foreground hover:text-primary transition-colors">
              Privacy Policy
            </Link>
            <span className="text-muted-foreground/50">•</span>
            <Link to="/about" className="text-muted-foreground hover:text-primary transition-colors">
              About
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">Powered by Manifold Markets • All loans settled in M$</p>
        </div>
      </div>
    </footer>
  );
}
