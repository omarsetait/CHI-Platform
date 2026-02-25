import { Link } from "wouter";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md" data-testid="not-found-card">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-4 rounded-full bg-destructive/10">
              <AlertCircle className="h-10 w-10 text-destructive" aria-hidden="true" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-3xl font-bold" data-testid="text-404-title">
                404
              </h1>
              <h2 className="text-xl font-semibold text-foreground">
                Page Not Found
              </h2>
              <p className="text-sm text-muted-foreground max-w-sm">
                The page you're looking for doesn't exist or has been moved. 
                Let's get you back on track.
              </p>
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild data-testid="button-go-home">
            <Link href="/">
              <Home className="h-4 w-4 mr-2" aria-hidden="true" />
              Go to Home
            </Link>
          </Button>
          <Button 
            variant="outline" 
            onClick={() => window.history.back()}
            data-testid="button-go-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
            Go Back
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
