import { useTranslation } from "react-i18next";
import { createHashRouter, data, redirect } from "react-router";
import { syncLocaleWithUrl } from "./locale-url";
import { AppLayout } from "./AppLayout";
import { queryClient } from "./query-client";
import { RouteError } from "./RouteError";
import type { RouteErrorReason } from "./route-errors";
import { HomeRoute, homeLoader } from "./routes/home-route";
import { LessonRoute, codeLoader, lessonLoader, trackLoader } from "./routes/lesson-route";

// A hash router: the guide is a static bundle that must work on any static host (any subfolder) and a
// claude.ai artifact, none of which can rewrite deep paths to index.html. URLs look like
// #/lessons/R3?variant=v2 and are shareable.
function LoadingGuide() {
  const { t } = useTranslation();
  return <p className="visually-hidden">{t("app.loading")}</p>;
}

export const router = createHashRouter([
  {
    path: "/",
    Component: AppLayout,
    ErrorBoundary: RouteError,
    // First paint while the first lesson's content chunk loads (a few ms from cache).
    HydrateFallback: LoadingGuide,
    children: [
      {
        ErrorBoundary: RouteError,
        children: [
          { index: true, loader: homeLoader(queryClient), Component: HomeRoute },
          { path: "lessons", loader: homeLoader(queryClient), Component: HomeRoute },
          { path: "tracks/:trackId", loader: trackLoader(queryClient) },
          // P0 repeated Intro 00; keep old links pointed at the shared setup lesson.
          { path: "lessons/P0", loader: ({ request }) => redirect(`/lessons/00${new URL(request.url).search}`) },
          { path: "lessons/P0/code", loader: ({ request }) => redirect(`/lessons/00/code${new URL(request.url).search}`) },
          // The old S3 TFT lessons now lead to their Pulsar C5 ST7735 equivalents.
          { path: "lessons/03", loader: ({ request }) => redirect(`/lessons/O2${new URL(request.url).search}`) },
          { path: "lessons/03/code", loader: ({ request }) => redirect(`/lessons/O2/code${new URL(request.url).search}`) },
          { path: "lessons/03b", loader: ({ request }) => redirect(`/lessons/O3${new URL(request.url).search}`) },
          { path: "lessons/03b/code", loader: ({ request }) => redirect(`/lessons/O3/code${new URL(request.url).search}`) },
          { path: "lessons/:lessonId", loader: lessonLoader(queryClient), Component: LessonRoute },
          {
            path: "pinout",
            lazy: async () => ({ Component: (await import("./routes/pinout-route")).Component }),
          },
          {
            path: "flash",
            lazy: async () => ({ Component: (await import("./routes/flasher-route")).Component }),
          },
          {
            // Reading a lab's code, with setup's Arduino tab opening lesson 01 directly.
            path: "lessons/:lessonId/code",
            loader: codeLoader(queryClient),
            lazy: async () => ({ Component: (await import("./routes/code-route")).Component }),
          },
          {
            // The section's first address: old links (#/chip/blocks/uart?ref=…) keep working.
            path: "chip/*",
            loader: ({ params, request }) =>
              redirect(`/datasheet/${params["*"] ?? ""}${new URL(request.url).search}`),
          },
          {
            path: "datasheet",
            lazy: async () => ({ Component: (await import("./routes/c5-datasheet-route")).Component }),
          },
          {
            path: "datasheet/*",
            lazy: async () => ({ Component: (await import("./routes/c5-datasheet-route")).Component }),
          },
          {
            path: "settings",
            lazy: async () => ({ Component: (await import("./routes/settings-route")).Component }),
          },
          {
            path: "parts",
            lazy: async () => ({ Component: (await import("./routes/parts-route")).Component }),
          },
          {
            path: "log",
            lazy: async () => {
              const route = await import("./routes/log-route");
              return { loader: route.logLoader(queryClient), Component: route.Component };
            },
          },
          {
            path: "*",
            loader: () => {
              throw data({ reason: "noPage" } satisfies RouteErrorReason, { status: 404 });
            },
            Component: () => null,
          },
        ],
      },
    ],
  },
]);

// Every URL carries the language on screen (?lang=), so a copied link opens in it.
syncLocaleWithUrl(router);
