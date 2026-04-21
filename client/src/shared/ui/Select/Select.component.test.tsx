import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { Select } from "@/shared/ui/Select";

describe("Select", () => {
  it("renders label, options, error, and forwards the ref", async () => {
    const onChange = vi.fn();
    const ref = createRef<HTMLSelectElement>();

    render(
      <Select
        ref={ref}
        label="Consultorio"
        error="Campo requerido"
        value="office-1"
        onChange={onChange}
        options={[
          { value: "office-1", label: "Centro" },
          { value: "office-2", label: "Norte" },
        ]}
      />,
    );

    expect(screen.getByText("Consultorio")).toBeInTheDocument();
    expect(screen.getByText("Campo requerido")).toBeInTheDocument();
    expect(ref.current).toBe(screen.getByRole("combobox"));

    await userEvent.selectOptions(screen.getByRole("combobox"), "office-2");
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("renders without optional label and error", () => {
    render(
      <Select
        defaultValue="all"
        options={[
          { value: "all", label: "Todos" },
          { value: "office-1", label: "Centro" },
        ]}
      />,
    );

    expect(screen.queryByText("Campo requerido")).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Todos" })).toBeInTheDocument();
  });
});
