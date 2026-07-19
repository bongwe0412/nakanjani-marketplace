import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { StoreProvider } from "@/lib/store";
import { Layout } from "@/components/Layout";
import appCss from "../styles.css?url";
import { reportError } from "../lib/error-reporting";

function NotFoundComponent() {
  return (
    <Layout>
      <div className="flex min-h-[60vh] items-center justify-center text-center">
        <div>
          <h1 className="text-7xl font-bold text-gradient">404</h1>
          <p className="mt-3 text-muted-foreground">
            We couldn't find that page.
          </p>

          <a
            href="/"
            className="mt-6 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-[var(--primary-hover)]"
          >
            Go Home
          </a>
        </div>
      </div>
    </Layout>
  );
}

function ErrorComponent({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    reportError(error, {
      boundary: "tanstack_root_error_component",
    });
  }, [error]);

  return (
    <Layout>
      <div className="flex min-h-[60vh] items-center justify-center text-center">
        <div>
          <h1 className="text-xl font-semibold">
            Something went wrong
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Please try again or return to the homepage.
          </p>

          <div className="mt-6 flex justify-center gap-2">
            <button
              onClick={() => {
                router.invalidate();
                reset();
              }}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-[var(--primary-hover)]"
            >
              Try Again
            </button>

            <a
              href="/"
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-card"
            >
              Go Home
            </a>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },

      {
        title: "Nakanjani Market | South Africa's Multi-Vendor Marketplace",
      },

      {
        name: "description",
        content:
          "Nakanjani Market is a modern South African multi-vendor eCommerce marketplace connecting customers with trusted local businesses across fashion, electronics, home, beauty, groceries and more.",
      },

      {
        name: "keywords",
        content:
          "Nakanjani, Marketplace, South Africa, Ecommerce, Online Shopping, Multi Vendor Marketplace, Fashion, Electronics, Retail, React, TypeScript, AWS, PostgreSQL, Python",
      },

      {
        name: "author",
        content: "Sibongakonke Mthethwa | Vertex Labz",
      },

      {
        name: "theme-color",
        content: "#FFFFFF",
      },

      {
        property: "og:type",
        content: "website",
      },

      {
        property: "og:url",
        content: "https://nakanjani.co.za",
      },

      {
        property: "og:site_name",
        content: "Nakanjani Market",
      },

      {
        property: "og:title",
        content: "Nakanjani Market | South Africa's Multi-Vendor Marketplace",
      },

      {
        property: "og:description",
        content:
          "Discover trusted South African businesses, shop securely, and enjoy a modern multi-vendor shopping experience.",
      },

      {
        property: "og:image",
        content: "https://nakanjani.co.za/logo.png",
      },

      {
        name: "twitter:card",
        content: "summary_large_image",
      },

      {
        name: "twitter:title",
        content: "Nakanjani Market",
      },

      {
        name: "twitter:description",
        content:
          "Modern South African multi-vendor marketplace built with React, TypeScript, AWS and PostgreSQL.",
      },

      {
        name: "twitter:image",
        content: "https://nakanjani.co.za/logo.png",
      },
    ],

    links: [
      {
        rel: "canonical",
        href: "https://nakanjani.co.za",
      },

      {
        rel: "stylesheet",
        href: appCss,
      },

      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },

      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },

      {
        rel: "stylesheet",
        href:
          "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@400;500;600;700&display=swap",
      },
    ],
  }),

  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>

      <body>
        <div>{children}</div>
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <StoreProvider>
        <Layout>
          <Outlet />
        </Layout>

        <Toaster />
      </StoreProvider>
    </QueryClientProvider>
  );
}