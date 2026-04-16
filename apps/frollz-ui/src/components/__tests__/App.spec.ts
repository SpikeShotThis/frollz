// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createRouter, createMemoryHistory } from "vue-router";
import { axe } from "vitest-axe";
import App from "@/App.vue";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: "/", component: { template: "<div></div>" } },
    { path: "/emulsions", component: { template: "<div></div>" } },
    { path: "/films", component: { template: "<div></div>" } },
    { path: "/formats", component: { template: "<div></div>" } },
    { path: "/tags", component: { template: "<div></div>" } },
  ],
});

const axeOptions = {
  runOnly: { type: "tag" as const, values: ["wcag2a", "wcag2aa", "wcag21aa"] },
};

describe("App", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("skip link is the first focusable element and targets #main-content", async () => {
    const wrapper = mount(App, {
      global: { plugins: [router] },
      attachTo: document.body,
    });
    await router.isReady();
    await flushPromises();

    const firstLink = wrapper.find('a[href="#main-content"]');
    expect(firstLink.exists()).toBe(true);
    expect(firstLink.text()).toBe("Skip to main content");

    // Verify it is the first focusable element in the DOM
    const allFocusable = wrapper.findAll("a, button, [tabindex]");
    expect(allFocusable[0].attributes("href")).toBe("#main-content");

    wrapper.unmount();
  });

  it("page structure uses semantic landmarks: header, main, footer", async () => {
    const wrapper = mount(App, {
      global: { plugins: [router] },
      attachTo: document.body,
    });
    await router.isReady();
    await flushPromises();

    expect(wrapper.find("header").exists()).toBe(true);
    expect(wrapper.find("main#main-content").exists()).toBe(true);
    expect(wrapper.find("footer").exists()).toBe(true);

    wrapper.unmount();
  });

  it("renders without a11y violations", async () => {
    const wrapper = mount(App, {
      global: { plugins: [router] },
      attachTo: document.body,
    });
    await router.isReady();
    await flushPromises();

    const results = await axe(document.body, axeOptions);
    expect(results).toHaveNoViolations();

    wrapper.unmount();
  });
});
