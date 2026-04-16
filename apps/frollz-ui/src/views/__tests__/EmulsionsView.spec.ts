// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount, flushPromises, config } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createRouter, createMemoryHistory } from "vue-router";
import { axe } from "vitest-axe";
import EmulsionsView from "@/views/EmulsionsView.vue";
import {
  emulsionApi,
  formatApi,
  processApi,
  tagApi,
} from "@/services/api-client";

const axeOptions = {
  runOnly: { type: "tag" as const, values: ["wcag2a", "wcag2aa", "wcag21aa"] },
};

vi.mock("@/services/api-client", () => ({
  emulsionApi: {
    getAll: vi.fn(),
    createBulk: vi.fn(),
    addTag: vi.fn(),
    getBrands: vi.fn(),
    getManufacturers: vi.fn(),
  },
  formatApi: {
    getAll: vi.fn(),
  },
  processApi: {
    getAll: vi.fn(),
  },
  tagApi: {
    getAll: vi.fn(),
  },
}));

describe("StocksView", () => {
  const mockFormats = [
    { id: "fmt1", name: "35mm", packageId: "pkg1" },
    { id: "fmt2", name: "120", packageId: "pkg1" },
    { id: "fmt3", name: "I-Type", packageId: "pkg2" },
  ];

  const mockProcesses = [
    { id: "proc1", name: "C-41" },
    { id: "proc2", name: "B&W" },
    { id: "proc3", name: "Instant" },
  ];

  const mockEmulsions = [
    {
      id: "emu1",
      brand: "Portra 400",
      manufacturer: "Kodak",
      speed: 400,
      formatId: "fmt1",
      processId: "proc1",
      parentId: null,
      tags: [],
    },
  ];

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    config.global.plugins = [
      createRouter({
        history: createMemoryHistory(),
        routes: [
          { path: "/", component: { template: "<div></div>" } },
          { path: "/rolls", name: "rolls", component: { template: "<div/>" } },
        ],
      }),
    ];

    vi.mocked(emulsionApi.getAll).mockResolvedValue({
      data: mockEmulsions,
    } as any);
    vi.mocked(formatApi.getAll).mockResolvedValue({ data: mockFormats } as any);
    vi.mocked(processApi.getAll).mockResolvedValue({
      data: mockProcesses,
    } as any);
    vi.mocked(tagApi.getAll).mockResolvedValue({ data: [] } as any);
    vi.mocked(emulsionApi.addTag).mockResolvedValue({ data: {} } as any);
    vi.mocked(emulsionApi.getBrands).mockResolvedValue({ data: [] } as any);
    vi.mocked(emulsionApi.getManufacturers).mockResolvedValue({
      data: [],
    } as any);
  });

  afterEach(() => {
    config.global.plugins = [];
  });

  describe("accessibility", () => {
    it("renders the emulsion list without a11y violations", async () => {
      const wrapper = mount(EmulsionsView);
      await flushPromises();

      const results = await axe(wrapper.element, axeOptions);
      expect(results).toHaveNoViolations();
    });

    it("renders the Add Emulsion modal without a11y violations", async () => {
      const wrapper = mount(EmulsionsView);
      await flushPromises();

      const vm = wrapper.vm as any;
      vm.showModal = true;
      await wrapper.vm.$nextTick();

      const results = await axe(wrapper.element, axeOptions);
      expect(results).toHaveNoViolations();
    });
  });

  describe("component mounting", () => {
    it("should mount successfully and load data", async () => {
      mount(EmulsionsView);
      await flushPromises();

      expect(emulsionApi.getAll).toHaveBeenCalled();
      expect(formatApi.getAll).toHaveBeenCalled();
      expect(processApi.getAll).toHaveBeenCalled();
    });
  });

  describe("form validation", () => {
    it("should validate format selection in handleSubmit", async () => {
      const wrapper = mount(EmulsionsView);
      const vm = wrapper.vm as any;

      vm.form = {
        brand: "Test Brand",
        manufacturer: "Test Manufacturer",
        formatIds: [],
        processId: "proc1",
        speed: 400,
        boxImageUrl: "",
      };

      await vm.handleSubmit();

      expect(vm.error).toContain("Please select at least one format");
    });

    it("should proceed with API call when formats are selected", async () => {
      const mockCreated = [{ id: "emu-new" }];

      vi.mocked(emulsionApi.createBulk).mockResolvedValue({
        data: mockCreated,
      } as any);

      const wrapper = mount(EmulsionsView);
      const vm = wrapper.vm as any;

      vm.form = {
        brand: "Test Brand",
        manufacturer: "Test Manufacturer",
        formatIds: ["fmt1"],
        processId: 1,
        speed: 400,
        boxImageUrl: "",
      };
      vm.selectedTagIds = [];

      await vm.handleSubmit();

      expect(emulsionApi.createBulk).toHaveBeenCalledWith({
        brand: "Test Brand",
        manufacturer: "Test Manufacturer",
        formatIds: ["fmt1"],
        processId: 1,
        speed: 400,
      });
    });
  });

  describe("sorting", () => {
    const multiEmulsions = [
      {
        id: "e1",
        brand: "Zebra Film",
        manufacturer: "Alpha Corp",
        speed: 200,
        formatId: "fmt1",
        processId: "proc1",
        parentId: null,
        tags: [],
      },
      {
        id: "e2",
        brand: "Alpha Film",
        manufacturer: "Zebra Corp",
        speed: 400,
        formatId: "fmt2",
        processId: "proc2",
        parentId: null,
        tags: [],
      },
      {
        id: "e3",
        brand: "Mango Film",
        manufacturer: "Mango Corp",
        speed: 100,
        formatId: "fmt3",
        processId: "proc3",
        parentId: null,
        tags: [],
      },
    ];

    beforeEach(() => {
      vi.mocked(emulsionApi.getAll).mockResolvedValue({
        data: multiEmulsions,
      } as any);
    });

    it("should default sort by brand ascending", async () => {
      const wrapper = mount(EmulsionsView);
      await flushPromises();

      const vm = wrapper.vm as any;
      expect(vm.sortField).toBe("brand");
      expect(vm.sortDirection).toBe("asc");
      const brands = vm.sortedEmulsions.map((s: any) => s.brand);
      expect(brands).toEqual(["Alpha Film", "Mango Film", "Zebra Film"]);
    });

    it("should sort by a different field when setSort is called", async () => {
      const wrapper = mount(EmulsionsView);
      await flushPromises();

      const vm = wrapper.vm as any;
      vm.setSort("manufacturer");
      await wrapper.vm.$nextTick();

      expect(vm.sortField).toBe("manufacturer");
      expect(vm.sortDirection).toBe("asc");
      const manufacturers = vm.sortedEmulsions.map((s: any) => s.manufacturer);
      expect(manufacturers).toEqual(["Alpha Corp", "Mango Corp", "Zebra Corp"]);
    });

    it("should toggle sort direction when the same field is clicked again", async () => {
      const wrapper = mount(EmulsionsView);
      await flushPromises();

      const vm = wrapper.vm as any;
      vm.setSort("brand"); // already brand/asc → flip to desc
      await wrapper.vm.$nextTick();

      expect(vm.sortDirection).toBe("desc");
      const brands = vm.sortedEmulsions.map((s: any) => s.brand);
      expect(brands).toEqual(["Zebra Film", "Mango Film", "Alpha Film"]);
    });

    it("should reset to ascending when switching to a new field", async () => {
      const wrapper = mount(EmulsionsView);
      await flushPromises();

      const vm = wrapper.vm as any;
      vm.setSort("brand"); // flip to desc
      vm.setSort("speed"); // new field → asc
      await wrapper.vm.$nextTick();

      expect(vm.sortField).toBe("speed");
      expect(vm.sortDirection).toBe("asc");
      const speeds = vm.sortedEmulsions.map((s: any) => s.speed);
      expect(speeds).toEqual([100, 200, 400]);
    });

    it("should sort numerically by speed", async () => {
      const wrapper = mount(EmulsionsView);
      await flushPromises();

      const vm = wrapper.vm as any;
      vm.setSort("speed");
      await wrapper.vm.$nextTick();

      expect(vm.sortedEmulsions.map((s: any) => s.speed)).toEqual([
        100, 200, 400,
      ]);

      vm.setSort("speed"); // desc
      await wrapper.vm.$nextTick();
      expect(vm.sortedEmulsions.map((s: any) => s.speed)).toEqual([
        400, 200, 100,
      ]);
    });
  });

  describe("filtering", () => {
    const multiEmulsions = [
      {
        id: "e1",
        brand: "Portra 400",
        manufacturer: "Kodak",
        speed: 400,
        formatId: "fmt1",
        processId: "proc1",
        parentId: null,
        tags: [],
      },
      {
        id: "e2",
        brand: "HP5 Plus",
        manufacturer: "Ilford",
        speed: 400,
        formatId: "fmt1",
        processId: "proc2",
        parentId: null,
        tags: [],
      },
      {
        id: "e3",
        brand: "Velvia 50",
        manufacturer: "Fujifilm",
        speed: 50,
        formatId: "fmt2",
        processId: "proc2",
        parentId: null,
        tags: [],
      },
    ];

    beforeEach(() => {
      vi.mocked(emulsionApi.getAll).mockResolvedValue({
        data: multiEmulsions,
      } as any);
    });

    it("should start with no active filters", async () => {
      const wrapper = mount(EmulsionsView);
      await flushPromises();
      expect((wrapper.vm as any).activeFilters).toEqual([]);
    });

    it("should add a filter via addFilter", async () => {
      const wrapper = mount(EmulsionsView);
      await flushPromises();
      const vm = wrapper.vm as any;

      vm.addFilter("manufacturer", "Manufacturer", "Kodak");
      await wrapper.vm.$nextTick();

      expect(vm.activeFilters).toHaveLength(1);
      expect(vm.activeFilters[0]).toEqual({
        field: "manufacturer",
        label: "Manufacturer",
        value: "Kodak",
      });
    });

    it("should not add duplicate filters for the same field and value", async () => {
      const wrapper = mount(EmulsionsView);
      await flushPromises();
      const vm = wrapper.vm as any;

      vm.addFilter("manufacturer", "Manufacturer", "Kodak");
      vm.addFilter("manufacturer", "Manufacturer", "Kodak");
      await wrapper.vm.$nextTick();

      expect(vm.activeFilters).toHaveLength(1);
    });

    it("should filter sortedEmulsions by active filters", async () => {
      const wrapper = mount(EmulsionsView);
      await flushPromises();
      const vm = wrapper.vm as any;

      vm.addFilter("manufacturer", "Manufacturer", "Kodak");
      await wrapper.vm.$nextTick();

      expect(vm.sortedEmulsions).toHaveLength(1);
      expect(vm.sortedEmulsions[0].brand).toBe("Portra 400");
    });

    it("should apply multiple filters with AND logic", async () => {
      const wrapper = mount(EmulsionsView);
      await flushPromises();
      const vm = wrapper.vm as any;

      vm.addFilter("formatId", "Format", "fmt1");
      vm.addFilter("speed", "Speed", "400");
      await wrapper.vm.$nextTick();

      expect(vm.sortedEmulsions).toHaveLength(2);
    });

    it("should remove a specific filter", async () => {
      const wrapper = mount(EmulsionsView);
      await flushPromises();
      const vm = wrapper.vm as any;

      vm.addFilter("formatId", "Format", "fmt1");
      vm.addFilter("manufacturer", "Manufacturer", "Kodak");
      await wrapper.vm.$nextTick();

      vm.removeFilter(0);
      await wrapper.vm.$nextTick();

      expect(vm.activeFilters).toHaveLength(1);
      expect(vm.activeFilters[0].field).toBe("manufacturer");
    });

    it("should clear all filters", async () => {
      const wrapper = mount(EmulsionsView);
      await flushPromises();
      const vm = wrapper.vm as any;

      vm.addFilter("formatId", "Format", "fmt1");
      vm.addFilter("manufacturer", "Manufacturer", "Kodak");
      vm.clearFilters();
      await wrapper.vm.$nextTick();

      expect(vm.activeFilters).toHaveLength(0);
      expect(vm.sortedEmulsions).toHaveLength(3);
    });

    it("should not add filter when value is empty", async () => {
      const wrapper = mount(EmulsionsView);
      await flushPromises();
      const vm = wrapper.vm as any;

      vm.addFilter("formatId", "Format", "");
      await wrapper.vm.$nextTick();

      expect(vm.activeFilters).toHaveLength(0);
    });

    it('should render filter chips with "field: value" label', async () => {
      const wrapper = mount(EmulsionsView);
      await flushPromises();
      const vm = wrapper.vm as any;

      vm.addFilter("manufacturer", "Manufacturer", "Kodak");
      await wrapper.vm.$nextTick();

      expect(wrapper.text()).toContain("Manufacturer: Kodak");
    });
  });

  describe("multiple format creation and tag association", () => {
    it("should associate tags with all created emulsions", async () => {
      const mockCreated = [{ id: "emu1" }, { id: "emu2" }];

      vi.mocked(emulsionApi.createBulk).mockResolvedValue({
        data: mockCreated,
      } as any);

      const wrapper = mount(EmulsionsView);
      const vm = wrapper.vm as any;

      vm.form = {
        brand: "Test Brand",
        manufacturer: "Test Manufacturer",
        formatIds: ["fmt1", "fmt2"],
        processId: "proc1",
        speed: 400,
        boxImageUrl: "",
      };
      vm.selectedTagIds = ["tag1", "tag2"];

      await vm.handleSubmit();

      // 2 emulsions × 2 tags = 4 calls
      expect(emulsionApi.addTag).toHaveBeenCalledTimes(4);
      expect(emulsionApi.addTag).toHaveBeenCalledWith("emu1", "tag1");
      expect(emulsionApi.addTag).toHaveBeenCalledWith("emu1", "tag2");
      expect(emulsionApi.addTag).toHaveBeenCalledWith("emu2", "tag1");
      expect(emulsionApi.addTag).toHaveBeenCalledWith("emu2", "tag2");
    });
  });
});
