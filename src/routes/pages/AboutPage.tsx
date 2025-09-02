import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export function AboutPage() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>About This Demo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This application demonstrates various React Router v6 features including:
          </p>
          <ul className="list-disc pl-6 text-sm space-y-1">
            <li>Basic routing</li>
            <li>Nested routes</li>
            <li>Route parameters</li>
            <li>Nested layouts</li>
            <li>Loader functions</li>
            <li>404 handling</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
