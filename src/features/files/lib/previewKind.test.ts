import { describe, expect, it } from "vitest";
import { previewKindForExtension, previewKindForFile } from "@/features/files/lib/previewKind";

describe("previewKindForExtension", () => {
  it("classifies each media family", () => {
    expect(previewKindForExtension("png")).toBe("image");
    expect(previewKindForExtension("md")).toBe("markdown");
    expect(previewKindForExtension("mp4")).toBe("video");
    expect(previewKindForExtension("mp3")).toBe("audio");
    expect(previewKindForExtension("pdf")).toBe("pdf");
    expect(previewKindForExtension("woff2")).toBe("binary");
  });

  it("treats unknown and source extensions as code", () => {
    expect(previewKindForExtension("ts")).toBe("code");
    expect(previewKindForExtension("json")).toBe("code");
    expect(previewKindForExtension("rb")).toBe("code");
    expect(previewKindForExtension("weirdext")).toBe("code");
  });

  it("is case insensitive", () => {
    expect(previewKindForExtension("PNG")).toBe("image");
    expect(previewKindForExtension("Mp4")).toBe("video");
  });
});

describe("previewKindForFile", () => {
  it("previews extensionless files that are known to be text", () => {
    expect(previewKindForFile("Dockerfile")).toBe("code");
    expect(previewKindForFile("Gemfile")).toBe("code");
    expect(previewKindForFile("Makefile")).toBe("code");
    expect(previewKindForFile("LICENSE")).toBe("code");
  });

  it("previews dotfiles that are known to be text", () => {
    expect(previewKindForFile(".gitignore")).toBe("code");
    expect(previewKindForFile(".env")).toBe("code");
    expect(previewKindForFile(".env.local")).toBe("code");
  });

  it("still classifies normal files by extension", () => {
    expect(previewKindForFile("package.json")).toBe("code");
    expect(previewKindForFile("logo.png")).toBe("image");
    expect(previewKindForFile("demo.mp4")).toBe("video");
    expect(previewKindForFile("font.woff2")).toBe("binary");
  });
});
