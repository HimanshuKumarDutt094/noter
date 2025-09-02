import { Button } from "@/components/ui/button";
import { useNavigate, useRouteError } from "react-router";
import { routes } from "@/routes/routePaths";

export default function ErrorPage() {
  const navigate = useNavigate();
  const raw = useRouteError();
  const err =
    typeof raw === "object" && raw !== null && ("statusText" in raw || "message" in raw)
      ? (raw as { statusText?: string; message?: string })
      : undefined;

  return (
    <div className="min-h-[40vh] flex items-center justify-center p-6">
      <div className="max-w-xl w-full text-center space-y-4">
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="text-sm text-muted-foreground">
          {err?.statusText || err?.message || "An unexpected error occurred while rendering this page."}
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" onClick={() => navigate(-1)}>Go Back</Button>
          <Button onClick={() => navigate(routes.home())}>Go Home</Button>
        </div>
      </div>
    </div>
  );
}
