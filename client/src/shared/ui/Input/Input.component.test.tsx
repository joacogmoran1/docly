import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { Input } from "@/shared/ui/Input";

describe("Input", () => {
  it("renders label, hint and forwards the ref", () => {
    const ref = createRef<HTMLInputElement>();

    render(<Input ref={ref} label="Nombre" hint="Como figura en tu DNI" className="input-extra" />);

    expect(screen.getByText("Nombre")).toBeInTheDocument();
    expect(screen.getByText("Como figura en tu DNI")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveClass("input-base", "input-extra");
    expect(ref.current).toBe(screen.getByRole("textbox"));
  });

  it("prioritizes errors over hints and supports unlabeled inputs", () => {
    render(<Input aria-label="Email" error="Email invalido" hint="No se muestra" />);

    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByText("Email invalido")).toBeInTheDocument();
    expect(screen.queryByText("No se muestra")).not.toBeInTheDocument();
    expect(screen.queryByText("Email", { selector: ".field-label" })).not.toBeInTheDocument();
  });
});
