import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseView } from "@next-tsx/parser";
import { convertView } from "./modules/convertView.js";

describe("convertTsx", () => {
  test("should work", async () => {
    const code = await readFile(
      path.join(__dirname, "../../parser/src/__fixtures__/logs.txt"),
      "utf-8"
    );

    const view = parseView(code);
    const result = await convertView(view, { rootId: "test-root" });
    expect(result).toMatchSnapshot();
  });
});
