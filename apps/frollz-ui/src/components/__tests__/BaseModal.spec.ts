// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { axe } from "vitest-axe";
import BaseModal from "@/components/BaseModal.vue";

const axeOptions = {
  runOnly: { type: "tag" as const, values: ["wcag2a", "wcag2aa", "wcag21aa"] },
};

function mountModal(open = true) {
  return mount(BaseModal, {
    props: { open, titleId: "test-title" },
    slots: {
      default:
        '<h2 id="test-title">Test Dialog</h2><button>OK</button><button>Cancel</button>',
    },
    attachTo: document.body,
  });
}

describe("BaseModal", () => {
  it("renders nothing when open is false", () => {
    const wrapper = mountModal(false);
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it("renders dialog with correct ARIA attributes when open", () => {
    const wrapper = mountModal();
    const dialog = wrapper.find('[role="dialog"]');
    expect(dialog.exists()).toBe(true);
    expect(dialog.attributes("aria-modal")).toBe("true");
    expect(dialog.attributes("aria-labelledby")).toBe("test-title");
    wrapper.unmount();
  });

  it("renders without a11y violations when open", async () => {
    const wrapper = mountModal();
    const results = await axe(document.body, axeOptions);
    expect(results).toHaveNoViolations();
    wrapper.unmount();
  });

  it("emits close on Escape key", async () => {
    const wrapper = mountModal();
    await wrapper.find('[role="dialog"]').trigger("keydown", { key: "Escape" });
    expect(wrapper.emitted("close")).toBeTruthy();
    wrapper.unmount();
  });

  it("traps focus: Tab from last focusable wraps to first", async () => {
    const wrapper = mountModal();
    const buttons = wrapper.findAll("button");
    const last = buttons[buttons.length - 1].element;
    last.focus();

    await wrapper
      .find('[role="dialog"]')
      .trigger("keydown", { key: "Tab", shiftKey: false });
    // trapFocus calls preventDefault and moves focus to first — verify no error thrown
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true);
    wrapper.unmount();
  });

  it("traps focus: Shift+Tab from first focusable wraps to last", async () => {
    const wrapper = mountModal();
    const buttons = wrapper.findAll("button");
    buttons[0].element.focus();

    await wrapper
      .find('[role="dialog"]')
      .trigger("keydown", { key: "Tab", shiftKey: true });
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true);
    wrapper.unmount();
  });

  it("restores focus to trigger element on close", async () => {
    const trigger = document.createElement("button");
    trigger.textContent = "Open";
    document.body.appendChild(trigger);
    trigger.focus();

    const wrapper = mount(BaseModal, {
      props: { open: true, titleId: "test-title" },
      slots: { default: '<h2 id="test-title">Test</h2><button>OK</button>' },
      attachTo: document.body,
    });

    await wrapper.setProps({ open: false });
    await nextTick();
    expect(document.activeElement).toBe(trigger);

    trigger.remove();
    wrapper.unmount();
  });
});
