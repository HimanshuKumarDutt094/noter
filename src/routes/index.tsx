import { RouterProvider } from "react-router";
import { router } from "./router";
import type { JSX } from "react";
import { NuqsAdapter } from "nuqs/adapters/react-router/v7";

/**
 * AppRouter Component
 *
 * Provides the router context to the application using React Router v7.
 * This component should be rendered at the root of your application.
 *
 * @returns {JSX.Element} The router provider with the application routes
 */
export function AppRouter(): JSX.Element {
  return (
    <NuqsAdapter>
      <RouterProvider router={router} />
    </NuqsAdapter>
  );
}
