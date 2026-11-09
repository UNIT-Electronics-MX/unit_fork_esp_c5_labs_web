import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import i18next from "i18next";
import { renderToString } from "react-dom/server";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { Component } from "./pinout-route";

describe("interactive pinout route", () => {
  it("renders the board with its signal context", async () => {
    const language = i18next.createInstance();
    await language.init({ lng: "en", resources: { en: { common: {} } }, defaultNS: "common" });
    const queryClient = new QueryClient();
    const html = renderToString(
      <I18nextProvider i18n={language}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={["/pinout"]}>
            <Component />
          </MemoryRouter>
        </QueryClientProvider>
      </I18nextProvider>,
    );
    expect(html).toContain('data-pin-index="0"');
    expect(html).toContain('data-pin-index="29"');
  });
});
