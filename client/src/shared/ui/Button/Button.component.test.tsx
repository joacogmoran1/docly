import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "@/shared/ui/Button";

describe("Button", () => {
  it("renders with variant and full-width classes", async () => {
    const onClick = vi.fn();

    render(
      <Button variant="danger" fullWidth className="custom-class" onClick={onClick}>
        Eliminar
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Eliminar" });
    expect(button).toHaveClass("button-base", "button-danger", "w-full", "custom-class");

    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("defaults to the primary variant", () => {
    render(<Button>Guardar</Button>);

    expect(screen.getByRole("button", { name: "Guardar" })).toHaveClass("button-primary");
  });
});
