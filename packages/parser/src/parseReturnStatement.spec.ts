import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseTemplate } from "./parseTemplate.js";

describe("parseTemplate with return statements", () => {
  test("should support return statements in event handlers", async () => {
    const code = await readFile(
      path.join(__dirname, "./__fixtures__/return-test.txt"),
      "utf-8"
    );

    const tpl = parseTemplate(code);

    // Should parse without errors
    expect(tpl.errors).toHaveLength(0);

    // Should have the component with event handlers
    expect(tpl.component).toBeDefined();
    expect(tpl.component?.events).toBeDefined();
  });
});
