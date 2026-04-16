// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createRouter, createMemoryHistory } from "vue-router";
import { axe } from "vitest-axe";
import FilmsView from "@/views/FilmsView.vue";
import {
  filmApi,
  emulsionApi,
  transitionApi,
  formatApi,
  tagApi,
} from "@/services/api-client";
import type { Film } from "@/types";
import { randomInt } from "crypto";

const randomId = () => randomInt(1, 1000000);

const axeOptions = {
  runOnly: { type: "tag" as const, values: ["wcag2a", "wcag2aa", "wcag21aa"] },
};

vi.mock("@/services/api-client", () => ({
  filmApi: {
    getAll: vi.fn(),
    create: vi.fn(),
  },
  emulsionApi: {
    getAll: vi.fn(),
  },
  formatApi: {
    getAll: vi.fn(),
  },
  tagApi: {
    getAll: vi.fn(),
  },
  transitionApi: {
    getProfiles: vi.fn(),
  },
}));

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: "/", name: "films", component: FilmsView },
    {
      path: "/films/:key",
      name: "film-detail",
      component: { template: "<div/>" },
    },
  ],
});

const makeFilm = (overrides: Partial<Film> = {}): Film => ({
  id: randomId(),
  name: "roll-00001",
  emulsionId: randomId(),
  expirationDate: new Date("2025-12-01"),
  parentId: null,
  transitionProfileId: randomId(),
  tags: [],
  states: [],
  ...overrides,
});

const mockProfiles = [
  { id: "prof-standard", name: "standard" },
  { id: "prof-bulk", name: "bulk" },
  { id: "prof-instant", name: "instant" },
];

describe("FilmsView", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    vi.mocked(filmApi.getAll).mockResolvedValue({ data: [] } as any);
    vi.mocked(emulsionApi.getAll).mockResolvedValue({ data: [] } as any);
    vi.mocked(formatApi.getAll).mockResolvedValue({ data: [] } as any);
    vi.mocked(tagApi.getAll).mockResolvedValue({ data: [] } as any);
    vi.mocked(transitionApi.getProfiles).mockResolvedValue({
      data: mockProfiles,
    } as any);
  });

  describe("accessibility", () => {
    it("renders the films list without a11y violations", async () => {
      const wrapper = mount(FilmsView, { global: { plugins: [router] } });
      await flushPromises();

      const results = await axe(wrapper.element, axeOptions);
      expect(results).toHaveNoViolations();
    });

    it("renders the Add Film modal without a11y violations", async () => {
      const wrapper = mount(FilmsView, { global: { plugins: [router] } });
      await flushPromises();

      const vm = wrapper.vm as any;
      vm.openAddFilm();
      await wrapper.vm.$nextTick();

      const results = await axe(wrapper.element, axeOptions);
      expect(results).toHaveNoViolations();
    });
  });

  describe("component mounting", () => {
    it("should load films and profiles on mount", async () => {
      mount(FilmsView, { global: { plugins: [router] } });
      await flushPromises();

      expect(filmApi.getAll).toHaveBeenCalled();
      expect(transitionApi.getProfiles).toHaveBeenCalled();
    });

    it("should display films after loading", async () => {
      const film = makeFilm({ name: "roll-00042" });
      vi.mocked(filmApi.getAll).mockResolvedValue({ data: [film] } as any);

      const wrapper = mount(FilmsView, { global: { plugins: [router] } });
      await flushPromises();

      expect(wrapper.text()).toContain("roll-00042");
    });

    it("should show empty state when no films", async () => {
      const wrapper = mount(FilmsView, { global: { plugins: [router] } });
      await flushPromises();

      expect(wrapper.text()).toContain("No films found");
    });
  });

  describe("bulk films", () => {
    it("should identify bulk films by transition profile", async () => {
      const bulkFilm = makeFilm({
        transitionProfileId: "prof-bulk",
        name: "canister-001",
      });
      const standardFilm = makeFilm({
        transitionProfileId: "prof-standard",
        name: "roll-00001",
      });
      vi.mocked(filmApi.getAll).mockResolvedValue({
        data: [bulkFilm, standardFilm],
      } as any);

      const wrapper = mount(FilmsView, { global: { plugins: [router] } });
      await flushPromises();

      const vm = wrapper.vm as any;
      expect(vm.bulkFilms).toHaveLength(1);
      expect(vm.bulkFilms[0].name).toBe("canister-001");
    });
  });

  describe("state filtering", () => {
    it("should call filmApi.getAll with state param when states are selected", async () => {
      const wrapper = mount(FilmsView, { global: { plugins: [router] } });
      await flushPromises();

      const vm = wrapper.vm as any;
      vm.selectedStates = ["Added"];
      await flushPromises();

      expect(filmApi.getAll).toHaveBeenCalledWith({ state: ["Added"] });
    });

    it("should call filmApi.getAll without params when state filter is cleared", async () => {
      const wrapper = mount(FilmsView, { global: { plugins: [router] } });
      await flushPromises();

      const vm = wrapper.vm as any;
      vm.selectedStates = ["Added"];
      await flushPromises();
      vm.selectedStates = [];
      await flushPromises();

      expect(filmApi.getAll).toHaveBeenLastCalledWith(undefined);
    });
  });

  describe("search", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it("should call filmApi.getAll with q param after debounce", async () => {
      const wrapper = mount(FilmsView, { global: { plugins: [router] } });
      await flushPromises();

      const vm = wrapper.vm as any;
      vm.searchQuery = "scotland";
      await wrapper.vm.$nextTick(); // let Vue flush the watch
      vi.advanceTimersByTime(300);
      await flushPromises();

      expect(filmApi.getAll).toHaveBeenCalledWith({ q: "scotland" });
    });

    it("should not fire immediately before debounce delay", async () => {
      const wrapper = mount(FilmsView, { global: { plugins: [router] } });
      await flushPromises();

      const callCountBefore = vi.mocked(filmApi.getAll).mock.calls.length;
      const vm = wrapper.vm as any;
      vm.searchQuery = "scotland";
      await wrapper.vm.$nextTick(); // let Vue flush the watch
      vi.advanceTimersByTime(100);
      await flushPromises();

      expect(vi.mocked(filmApi.getAll).mock.calls.length).toBe(callCountBefore);
    });

    it("should include search chip in activeFilterChips when searchQuery is set", async () => {
      const wrapper = mount(FilmsView, { global: { plugins: [router] } });
      await flushPromises();

      const vm = wrapper.vm as any;
      vm.searchQuery = "scotland";
      await wrapper.vm.$nextTick();

      const chip = vm.activeFilterChips.find((c: any) => c.key === "search");
      expect(chip).toBeDefined();
      expect(chip.label).toBe('"scotland"');
    });

    it("should clear searchQuery when search chip is removed", async () => {
      const wrapper = mount(FilmsView, { global: { plugins: [router] } });
      await flushPromises();

      const vm = wrapper.vm as any;
      vm.searchQuery = "scotland";
      await wrapper.vm.$nextTick();

      const chip = vm.activeFilterChips.find((c: any) => c.key === "search");
      chip.remove();
      await wrapper.vm.$nextTick();

      expect(vm.searchQuery).toBe("");
    });

    it("should clear searchQuery on clearAllFilters", async () => {
      const wrapper = mount(FilmsView, { global: { plugins: [router] } });
      await flushPromises();

      const vm = wrapper.vm as any;
      vm.searchQuery = "scotland";
      vm.clearAllFilters();
      await wrapper.vm.$nextTick();

      expect(vm.searchQuery).toBe("");
    });
  });

  describe("scan link indicator", () => {
    const makeFilmWithScans = (urls: string[]): Film =>
      makeFilm({
        states: [
          {
            id: 1,
            filmId: 1,
            stateId: 1,
            date: new Date("2026-01-01"),
            note: null,
            metadata:
              urls.length > 0
                ? [
                    {
                      id: 1,
                      filmStateId: 1,
                      transitionStateMetadataId: 1,
                      value: urls,
                      transitionStateMetadata: {
                        id: 1,
                        fieldId: 1,
                        transitionStateId: 1,
                        defaultValue: null,
                        field: {
                          id: 1,
                          name: "scansUrl",
                          fieldType: "url",
                          allowMultiple: true,
                        },
                      },
                    },
                  ]
                : [],
          },
        ],
      });

    it("shows no scan indicator for a film with no scans", async () => {
      const film = makeFilm();
      vi.mocked(filmApi.getAll).mockResolvedValue({ data: [film] } as any);

      const wrapper = mount(FilmsView, { global: { plugins: [router] } });
      await flushPromises();

      expect(wrapper.findAll('[data-testid="scan-indicator"]')).toHaveLength(0);
    });

    it("renders an external link for a film with 1 scan URL", async () => {
      const film = makeFilmWithScans(["https://drive.google.com/folder/abc"]);
      vi.mocked(filmApi.getAll).mockResolvedValue({ data: [film] } as any);

      const wrapper = mount(FilmsView, { global: { plugins: [router] } });
      await flushPromises();

      const indicators = wrapper.findAll('[data-testid="scan-indicator"]');
      expect(indicators.length).toBeGreaterThan(0);
      // At least one should be an anchor pointing to the scan URL
      const externalLink = indicators.find(
        (el) =>
          el.element.tagName === "A" &&
          el.attributes("href") === "https://drive.google.com/folder/abc",
      );
      expect(externalLink).toBeDefined();
      expect(externalLink!.attributes("target")).toBe("_blank");
    });

    it("shows count badge matching number of scan URLs", async () => {
      const film = makeFilmWithScans([
        "https://drive.google.com/folder/abc",
        "https://drive.google.com/folder/xyz",
      ]);
      vi.mocked(filmApi.getAll).mockResolvedValue({ data: [film] } as any);

      const wrapper = mount(FilmsView, { global: { plugins: [router] } });
      await flushPromises();

      const indicators = wrapper.findAll('[data-testid="scan-indicator"]');
      expect(indicators.length).toBeGreaterThan(0);
      // Each indicator should display the count "2"
      expect(indicators[0].text()).toContain("2");
    });

    it("links to film detail for a film with multiple scan URLs (desktop)", async () => {
      const film = makeFilmWithScans([
        "https://drive.google.com/folder/abc",
        "https://drive.google.com/folder/xyz",
      ]);
      vi.mocked(filmApi.getAll).mockResolvedValue({ data: [film] } as any);

      const wrapper = mount(FilmsView, { global: { plugins: [router] } });
      await flushPromises();

      // The desktop scan indicator for 2+ scans should be a RouterLink (renders as <a>)
      // pointing to the film detail route, not an external URL
      const indicators = wrapper.findAll('[data-testid="scan-indicator"]');
      const detailLink = indicators.find(
        (el) =>
          el.element.tagName === "A" &&
          el.attributes("href")?.includes(`${film.id}`) &&
          el.attributes("target") !== "_blank",
      );
      expect(detailLink).toBeDefined();
    });
  });

  describe("add film form", () => {
    it("should open modal and set standard profile on openAddFilm", async () => {
      const wrapper = mount(FilmsView, { global: { plugins: [router] } });
      await flushPromises();

      const vm = wrapper.vm as any;
      vm.openAddFilm();
      await wrapper.vm.$nextTick();

      expect(vm.showModal).toBe(true);
      expect(vm.form.transitionProfileId).toBe("prof-standard");
    });

    it("should set bulk profile when isBulkFilm is toggled on", async () => {
      const wrapper = mount(FilmsView, { global: { plugins: [router] } });
      await flushPromises();

      const vm = wrapper.vm as any;
      vm.openAddFilm();
      vm.form.isBulkFilm = true;
      vm.onBulkFilmToggle();
      await wrapper.vm.$nextTick();

      expect(vm.form.transitionProfileId).toBe("prof-bulk");
    });

    it("should reset to standard profile when isBulkFilm is toggled off", async () => {
      const wrapper = mount(FilmsView, { global: { plugins: [router] } });
      await flushPromises();

      const vm = wrapper.vm as any;
      vm.openAddFilm();
      vm.form.isBulkFilm = true;
      vm.onBulkFilmToggle();
      vm.form.isBulkFilm = false;
      vm.onBulkFilmToggle();
      await wrapper.vm.$nextTick();

      expect(vm.form.transitionProfileId).toBe("prof-standard");
    });

    it("should close modal and reset form on closeModal", async () => {
      const wrapper = mount(FilmsView, { global: { plugins: [router] } });
      await flushPromises();

      const vm = wrapper.vm as any;
      vm.openAddFilm();
      vm.form.name = "test-roll";
      vm.closeModal();
      await wrapper.vm.$nextTick();

      expect(vm.showModal).toBe(false);
      expect(vm.form.name).toBe("");
    });
  });
});
