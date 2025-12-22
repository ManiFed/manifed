import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, FileText } from "lucide-react";
import Footer from "@/components/layout/Footer";

export default function TermsOfService() {
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
              <FileText className="w-6 h-6 text-primary" />
              Terms of Service
            </CardTitle>
            <p className="text-muted-foreground">Last updated: December 2024</p>
          </CardHeader>
          <CardContent className="prose prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold text-foreground">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground">
                By accessing or using ManiFed ("the Platform"), you agree to be bound by these Terms of Service. 
                If you do not agree to these terms, do not use the Platform.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">2. Description of Service</h2>
              <p className="text-muted-foreground">
                ManiFed is an experimental platform for peer-to-peer lending using Manifold Markets' virtual currency (M$). 
                The Platform also provides AI-powered tools for prediction market analysis. All transactions are conducted 
                in play money with no real-world monetary value.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">3. No Real Money</h2>
              <p className="text-muted-foreground">
                M$ (Mana) is a virtual currency used on Manifold Markets and has no real-world cash value. You cannot 
                exchange M$ for real money. Any "loans," "bonds," or "investments" made through ManiFed are purely 
                virtual and carry no legal financial obligations.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">4. No Guarantee of Repayment</h2>
              <p className="text-muted-foreground">
                Loans made through ManiFed are not legally enforceable. Repayment depends entirely on the borrower's 
                goodwill and reputation. You may lose your entire investment. ManiFed does not guarantee any returns 
                and cannot enforce loan repayment.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">5. User Responsibilities</h2>
              <p className="text-muted-foreground">
                You are responsible for: maintaining the security of your account, conducting your own due diligence 
                on borrowers, understanding the risks of lending virtual currency, and complying with Manifold Markets' 
                Terms of Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">6. AI Tools Disclaimer</h2>
              <p className="text-muted-foreground">
                AI-powered features (arbitrage scanning, market analysis, comment generation) are provided for 
                entertainment and informational purposes only. They do not constitute financial advice. AI predictions 
                and analyses may be inaccurate.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">7. Limitation of Liability</h2>
              <p className="text-muted-foreground">
                ManiFed is provided "as is" without warranties of any kind. We are not liable for any losses 
                (including loss of virtual currency), damages, or disputes arising from your use of the Platform.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">8. Changes to Terms</h2>
              <p className="text-muted-foreground">
                We reserve the right to modify these terms at any time. Continued use of the Platform after changes 
                constitutes acceptance of the new terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">9. Contact</h2>
              <p className="text-muted-foreground">
                For questions about these Terms, contact us via DM @ManiFed on Manifold Markets or Discord @manifed.
              </p>
            </section>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
