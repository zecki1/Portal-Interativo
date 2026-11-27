// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { PreviewModal } from "./PreviewModal";

afterEach(cleanup);

describe("PreviewModal", () => {
  it("resizes and reloads the preview for each selected device", () => {
    render(
      <PreviewModal
        projectId="project-1"
        projectName="Projeto de teste"
        apiBase="/api/v1"
        onClose={() => {}}
      />,
    );

    const frame = screen.getByTitle("Preview do Livro Interativo");
    const viewport = frame.parentElement;
    expect(viewport).toHaveStyle({ width: "100%" });

    fireEvent.click(screen.getByRole("button", { name: "Tablet" }));
    const tabletFrame = screen.getByTitle("Preview do Livro Interativo");
    expect(viewport).toHaveStyle({ width: "768px" });
    expect(tabletFrame).not.toBe(frame);
    expect(screen.getByRole("button", { name: "Tablet" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    fireEvent.click(screen.getByRole("button", { name: "Celular" }));
    const mobileFrame = screen.getByTitle("Preview do Livro Interativo");
    expect(viewport).toHaveStyle({ width: "380px" });
    expect(mobileFrame).not.toBe(tabletFrame);

    fireEvent.click(screen.getByRole("button", { name: "Desktop" }));
    expect(viewport).toHaveStyle({ width: "100%" });
  });
});
