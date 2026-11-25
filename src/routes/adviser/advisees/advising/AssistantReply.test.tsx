import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { AssistantReply } from "./AssistantReply";

afterEach(cleanup);

describe("AssistantReply", () => {
  it("renders Markdown", () => {
    const { container } = render(
      <AssistantReply
        content={
          "**Standing:** good\n\n- CS 101\n- CS 102\n\n| Course | Grade |\n| --- | --- |\n| CS 101 | 1.5 |"
        }
      />,
    );
    expect(container.querySelector("strong")?.textContent).toBe("Standing:");
    expect(container.querySelectorAll("li")).toHaveLength(2);
    expect(container.querySelector("table")).toBeTruthy();
    expect(container.textContent).not.toContain("**");
  });
  it("keeps plain text and its line breaks", () => {
    const { container } = render(
      <AssistantReply content={"First line.\nSecond line."} />,
    );
    expect(container.querySelectorAll("p")).toHaveLength(1);
    expect(container.querySelector("br")).toBeTruthy();
    expect(container.textContent).toBe("First line.\nSecond line.");
  });
  it("turns <br> inside table cells into line breaks", () => {
    const { container } = render(
      <AssistantReply
        content={
          "- Timeline:\n\n  | Term | Courses |\n  |------|---------|\n  | 1st | • Finish *CSCI 101*  <br>• Continue PHED 11 |"
        }
      />,
    );
    expect(container.querySelector("td br")).toBeTruthy();
    expect(container.querySelector("td em")?.textContent).toBe("CSCI 101");
    expect(container.textContent).not.toContain("<br>");
  });
  it("does not render raw HTML or images", () => {
    const { container } = render(
      <AssistantReply
        content={
          '<script>alert(1)</script>\n\n![x](https://example.com/x.png)\n\n<img src="y">'
        }
      />,
    );
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
  });
});
