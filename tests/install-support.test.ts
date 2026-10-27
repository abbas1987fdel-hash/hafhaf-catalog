import { describe, it, expect, vi } from "vitest";
import { createInstallSupport, installHelp } from "../src/install-support";
function promptEvent(outcome: "accepted" | "dismissed" = "accepted") {
  return Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
    prompt: vi.fn(async () => {}),
    userChoice: Promise.resolve({ outcome }),
  });
}
describe("browser installation lifecycle", () => {
  it("captures an offered prompt before a component subscribes and consumes it once", async () => {
    const target = new EventTarget();
    const support = createInstallSupport(target, () => false);
    const event = promptEvent();
    target.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(support.getSnapshot().ready).toBe(true);
    const changed = vi.fn();
    const unsubscribe = support.subscribe(changed);
    expect(await support.request()).toBe("accepted");
    expect(await support.request()).toBe("unavailable");
    expect(event.prompt).toHaveBeenCalledTimes(1);
    expect(changed).toHaveBeenCalledTimes(1);
    unsubscribe();
    support.dispose();
  });
  it("does not promise installation without a browser event", async () => {
    const support = createInstallSupport(new EventTarget(), () => false);
    expect(support.getSnapshot()).toEqual({ ready: false, installed: false });
    expect(await support.request()).toBe("unavailable");
    support.dispose();
  });
  it("handles dismissed and failed prompts without reusing the event", async () => {
    const target = new EventTarget();
    const support = createInstallSupport(target, () => false);
    target.dispatchEvent(promptEvent("dismissed"));
    expect(await support.request()).toBe("dismissed");
    expect(support.getSnapshot().ready).toBe(false);
    const bad = promptEvent();
    bad.prompt.mockRejectedValueOnce(Error("not allowed"));
    target.dispatchEvent(bad);
    expect(await support.request()).toBe("failed");
    expect(await support.request()).toBe("unavailable");
    support.dispose();
  });
  it("hides installation after appinstalled or standalone display mode", async () => {
    const target = new EventTarget();
    let standalone = false;
    const support = createInstallSupport(target, () => standalone);
    target.dispatchEvent(promptEvent());
    standalone = true;
    support.refresh();
    expect(support.getSnapshot()).toEqual({ ready: false, installed: true });
    standalone = false;
    target.dispatchEvent(new Event("appinstalled"));
    expect(support.getSnapshot().installed).toBe(true);
    target.dispatchEvent(promptEvent());
    expect(await support.request()).toBe("unavailable");
    support.dispose();
  });
});
describe("platform-specific installation help", () => {
  it("shows only the relevant mobile instructions", () => {
    expect(installHelp("iPhone Safari").text).toContain("Safari");
    expect(installHelp("iPhone Safari").text).not.toContain("Android");
    expect(installHelp("Android Chrome").text).not.toContain("iPhone");
    expect(installHelp("Android Chrome").text).toContain("⋮");
    expect(installHelp("Macintosh Safari", 5).text).toContain("مشاركة");
    expect(installHelp("Android wv Instagram").title).toContain("المتصفح");
    expect(installHelp("Windows Edg/").text).toContain("شريط العنوان");
  });
});
