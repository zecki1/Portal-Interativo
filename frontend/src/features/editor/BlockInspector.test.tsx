// @vitest-environment jsdom

import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Block, ProjectAsset } from "../../types/project";
import { BlockInspector } from "./BlockInspector";

afterEach(cleanup);

const assets: ProjectAsset[] = [
  { id: "image-1", fileName: "foto.jpg", path: "assets/foto.jpg", mimeType: "image/jpeg", altText: "" },
  { id: "placeholder", fileName: "ausente.jpg", path: "assets/ausente.jpg", mimeType: "image/placeholder", altText: "" },
];

function renderPuzzleInspector(onUploadAsset = vi.fn().mockResolvedValue(null)) {
  const onUpdateBlock = vi.fn();
  const block: Block = {
    id: "puzzle-1",
    type: "puzzle",
    data: { title: "Quebra-cabeça", image: "", size: 4 },
  };
  const result = render(
    <BlockInspector
      block={block}
      onUpdateBlock={onUpdateBlock}
      onDuplicateBlock={vi.fn()}
      onDeleteBlock={vi.fn()}
      onClose={vi.fn()}
      assets={assets}
      apiBase="/api"
      projectId="project-1"
      onUploadAsset={onUploadAsset}
    />,
  );
  return { ...result, onUpdateBlock, onUploadAsset };
}

describe("BlockInspector puzzle image sources", () => {
  it("accepts a direct image URL", () => {
    const { onUpdateBlock } = renderPuzzleInspector();
    const url = "https://images.unsplash.com/photo-123";

    fireEvent.change(screen.getByPlaceholderText("https://images.unsplash.com/…"), {
      target: { value: url },
    });

    expect(onUpdateBlock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ image: url }) }),
    );
  });

  it("allows selecting an image from project media", () => {
    const { onUpdateBlock } = renderPuzzleInspector();

    fireEvent.change(screen.getByDisplayValue("Selecionar uma imagem…"), {
      target: { value: "assets/foto.jpg" },
    });

    expect(onUpdateBlock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ image: "assets/foto.jpg" }) }),
    );
    expect(screen.queryByRole("option", { name: "ausente.jpg" })).not.toBeInTheDocument();
  });

  it("uploads an image from the computer and assigns the returned asset", async () => {
    const onUploadAsset = vi.fn().mockResolvedValue("assets/enviada.png");
    const { container, onUpdateBlock } = renderPuzzleInspector(onUploadAsset);
    const file = new File(["image"], "enviada.png", { type: "image/png" });
    const input = container.querySelector('input[type="file"]');

    expect(input).not.toBeNull();
    fireEvent.change(input!, { target: { files: [file] } });

    await waitFor(() => {
      expect(onUploadAsset).toHaveBeenCalledWith(file);
      expect(onUpdateBlock).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ image: "assets/enviada.png" }) }),
      );
    });
  });
});
