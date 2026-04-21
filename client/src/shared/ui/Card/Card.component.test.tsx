import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Card } from "@/shared/ui/Card";

describe("Card", () => {
  it("renders children without a header when no header props are provided", () => {
    render(<Card>Contenido simple</Card>);

    expect(screen.getByText("Contenido simple")).toBeInTheDocument();
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });

  it("renders title, description, action and custom classes", () => {
    const { container } = render(
      <Card
        title="Resumen"
        description="Descripcion breve"
        action={<button type="button">Accion</button>}
        className="panel-special"
      >
        Contenido
      </Card>,
    );

    expect(container.firstElementChild).toHaveClass("panel-special");
    expect(screen.getByRole("heading", { name: "Resumen" })).toBeInTheDocument();
    expect(screen.getByText("Descripcion breve")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Accion" })).toBeInTheDocument();
  });

  it("renders partial headers with description-only and action-only variants", () => {
    const { rerender } = render(<Card description="Solo descripcion">Contenido</Card>);

    expect(screen.getByText("Solo descripcion")).toBeInTheDocument();
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();

    rerender(<Card action={<button type="button">Solo accion</button>}>Contenido</Card>);

    expect(screen.getByRole("button", { name: "Solo accion" })).toBeInTheDocument();
  });
});
