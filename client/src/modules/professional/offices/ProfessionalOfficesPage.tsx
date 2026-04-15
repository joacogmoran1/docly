import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  createProfessionalOffice,
  getProfessionalOffices,
} from "@/modules/professional/api/professional.api";
import { useAuth } from "@/app/providers/AuthProvider";
import { CreateOfficeModal } from "@/modules/professional/offices/CreateOfficeModal";
import { queryKeys } from "@/shared/constants/query-keys";
import { ListEntry } from "@/shared/components/ListEntry";
import { SearchBar } from "@/shared/components/SearchBar";
import { Button } from "@/shared/ui/Button";

export function ProfessionalOfficesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const professionalId = user?.professionalId ?? "";
  const [search, setSearch] = useState("");
  const [isCreatingOffice, setIsCreatingOffice] = useState(false);
  const query = useQuery({
    queryKey: [...queryKeys.professionalOffices, professionalId],
    queryFn: () => getProfessionalOffices(professionalId),
    enabled: Boolean(professionalId),
  });
  const createOfficeMutation = useMutation({
    mutationFn: (values: {
      name: string;
      address: string;
      phone: string;
    }) =>
      createProfessionalOffice({
        professionalId,
        name: values.name.trim(),
        address: values.address.trim(),
        phone: values.phone.trim() || undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [...queryKeys.professionalOffices, professionalId],
      });
      setIsCreatingOffice(false);
    },
  });

  const rows = useMemo(() => {
    const items = query.data ?? [];
    return items.filter(
      (office) =>
        office.name.toLowerCase().includes(search.toLowerCase()) ||
        office.address.toLowerCase().includes(search.toLowerCase()),
    );
  }, [query.data, search]);

  if (query.isLoading) return <div className="centered-feedback">Cargando consultorios...</div>;
  if (query.isError || !query.data) {
    return <div className="centered-feedback">No pudimos cargar consultorios.</div>;
  }

  return (
    <div className="page-stack">
      <div className="dashboard-plain-header">
        <h1 className="title-lg">Consultorios</h1>
        <div className="offices-toolbar">
          <SearchBar placeholder="Buscar consultorio" value={search} onChange={setSearch} />
          <Button className="button-inline" onClick={() => setIsCreatingOffice(true)}>
            Crear consultorio
          </Button>
        </div>
      </div>

      <div className="dashboard-plain-list">
        {rows.map((office) => (
          <ListEntry
            key={office.id}
            title={office.name}
            className="office-entry"
            action={
              <Link to={`/professional/offices/${office.id}`}>
                <Button>Ver consultorio</Button>
              </Link>
            }
          >
            <span className="slot-entry-meta">{office.address}</span>
          </ListEntry>
        ))}

        {!rows.length ? <span className="meta">No encontramos consultorios para esa busqueda.</span> : null}
      </div>

      <CreateOfficeModal
        isOpen={isCreatingOffice}
        isSubmitting={createOfficeMutation.isPending}
        onClose={() => setIsCreatingOffice(false)}
        onSubmit={async (values) => {
          await createOfficeMutation.mutateAsync(values);
        }}
      />

      {createOfficeMutation.isError ? (
        <span className="field-error">
          {createOfficeMutation.error instanceof Error
            ? createOfficeMutation.error.message
            : "No se pudo crear el consultorio."}
        </span>
      ) : null}
    </div>
  );
}
