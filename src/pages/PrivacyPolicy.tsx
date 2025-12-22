import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Shield } from "lucide-react";
import Footer from "@/components/layout/Footer";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-3">
              <img alt="ManiFed" className="w-10 h-10 rounded-xl object-cover" src="/lovable-uploads/8cbf6124-13eb-440c-bd86-70a83fae6c42.png" />
              <span className="text-lg font-bold text-gradient">ManiFed</span>
            </Link>
            <Link to="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Shield className="w-6 h-6 text-primary" />
              Privacy Policy
            </CardTitle>
            <p className="text-muted-foreground">Last updated: December 2024</p>
          </CardHeader>
          <CardContent className="prose prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold text-foreground">1. Information We Collect</h2>
              <p className="text-muted-foreground">
                We collect information you provide when creating an account, including your email address and 
                Manifold Markets username. We also collect transaction data related to your use of the Platform.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">2. Manifold API Keys</h2>
              <p className="text-muted-foreground">
                If you provide a Manifold API key for features requiring account integration, we encrypt and 
                store it securely. API keys are only used to facilitate transactions you explicitly authorize. 
                For one-time use features, API keys are not stored after the operation completes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">3. How We Use Your Information</h2>
              <p className="text-muted-foreground">
                We use your information to: provide and maintain the Platform, process your transactions, 
                display your public profile and credit score, communicate with you about your account, 
                and improve our services.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">4. Information Sharing</h2>
              <p className="text-muted-foreground">
                We do not sell your personal information. We may share limited information: with other users 
                as part of the platform's functionality (e.g., public credit scores, loan listings), 
                with service providers who assist in operating the Platform, or as required by law.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">5. Data Security</h2>
              <p className="text-muted-foreground">
                We implement industry-standard security measures including encryption of sensitive data, 
                secure authentication, and regular security reviews. However, no system is completely secure, 
                and we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">6. Cookies and Analytics</h2>
              <p className="text-muted-foreground">
                We use essential cookies to maintain your session. We may use analytics to understand how 
                users interact with the Platform to improve our services.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">7. Your Rights</h2>
              <p className="text-muted-foreground">
                You can: access your personal data, request correction of inaccurate data, request deletion 
                of your account and associated data, and withdraw consent for data processing.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">8. Data Retention</h2>
              <p className="text-muted-foreground">
                We retain your data for as long as your account is active. Transaction history is kept for 
                platform integrity. You can request account deletion at any time.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">9. Changes to Privacy Policy</h2>
              <p className="text-muted-foreground">
                We may update this policy periodically. We will notify you of significant changes through the Platform.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">10. Contact</h2>
              <p className="text-muted-foreground">
                For privacy-related questions, contact us via DM @ManiFed on Manifold Markets or Discord @manifed.
              </p>
            </section>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
