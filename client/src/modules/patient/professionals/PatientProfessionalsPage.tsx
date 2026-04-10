import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  addProfessionalToTeam,
  getPatientTeamProfessionals,
  removeProfessionalFromTeam,
  searchProfessionals,
} from "@/modules/patient/api/patient.api";
import { useAuth } from "@/app/providers/AuthProvider";
import { queryKeys } from "@/shared/constants/query-keys";
import { ListEntry } from "@/shared/components/ListEntry";
import { SearchBar } from "@/shared/components/SearchBar";
import { Select } from "@/shared/ui/Select";
import { Button } from "@/shared/ui/Button";

export function PatientProfessionalsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const patientId = user?.patientId ?? "";
  const [tab, setTab] = useState("team");
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [coverage, setCoverage] = useState("");
  const teamQuery = useQuery({
    queryKey: [...queryKeys.patientProfessionals, patientId],
    queryFn: () => getPatientTeamProfessionals(patientId),
    enabled: Boolean(patientId),
  });
  const discoverQuery = useQuery({
    queryKey: [...queryKeys.patientProfessionalSearch, search, specialty, coverage],
    queryFn: () =>
      searchProfessionals({
        query: search,
        specialty,
        coverage,
      }),
    enabled: tab === "discover",
  });
  const toggleTeamMutation = useMutation({
    mutationFn: async ({
      professionalId,
      isInTeam,
    }: {
      professionalId: string;
      isInTeam: boolean;
    }) => {
      if (isInTeam) {
        await removeProfessionalFromTeam(patientId, professionalId);
        return;
      }

      await addProfessionalToTeam(patientId, professionalId);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [...queryKeys.patientProfessionals, patientId],
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.patientProfessionalSearch,
        }),
      ]);
    },
  });

  const teamProfessionals = teamQuery.data ?? [];
  const discoveredProfessionals = discoverQuery.data ?? [];
  const teamIds = new Set(teamProfessionals.map((professional) => professional.id));
  const professionals = (tab === "team" ? teamProfessionals : discoveredProfessionals).map(
    (professional) => ({
      ...professional,
      isInTeam: teamIds.has(professional.id),
    }),
  );

  const specialtyOptions = useMemo(() => {
    const values = Array.from(new Set(professionals.map((item) => item.specialty))).sort();
    return [
      { value: "", label: "Todas las especialidades" },
      ...values.map((value) => ({ value, label: value })),
    ];
  }, [professionals]);

  const coverageOptions = useMemo(() => {
    const values = Array.from(new Set(professionals.flatMap((item) => item.coverage))).sort();
    return [
      { value: "", label: "Todas las coberturas" },
      ...values.map((value) => ({ value, label: value })),
    ];
  }, [professionals]);

  const filteredRows = useMemo(
    () =>
      professionals.filter((professional) => {
        const normalizedSearch = search.toLowerCase();
        const matchesSearch =
          !search ||
          professional.fullName.toLowerCase().includes(normalizedSearch) ||
          professional.specialty.toLowerCase().includes(normalizedSearch);
        const matchesSpecialty = !specialty || professional.specialty === specialty;
        const matchesCoverage = !coverage || professional.coverage.includes(coverage);

        return matchesSearch && matchesSpecialty && matchesCoverage;
      }),
    [coverage, professionals, search, specialty],
  );

  if (teamQuery.isLoading || (tab === "discover" && discoverQuery.isLoading)) {
    return <div className="centered-feedback">Cargando profesionales...</div>;
  }
  if (teamQuery.isError || discoverQuery.isError) {
    return <div className="centered-feedback">No pudimos cargar profesionales.</div>;
  }

  return (
    <div className="page-stack">
      <div className="dashboard-plain-header">
        <h1 className="title-lg">Profesionales</h1>
        <div className="tabs-list">
          <button
            type="button"
            className={`tabs-trigger${tab === "team" ? " active" : ""}`}
            onClick={() => setTab("team")}
          >
            Equipo
          </button>
          <button
            type="button"
            className={`tabs-trigger${tab === "discover" ? " active" : ""}`}
            onClick={() => setTab("discover")}
          >
            Buscar profesionales
          </button>
        </div>
      </div>

      <div className="filters-inline">
        <SearchBar placeholder="Buscar por nombre o especialidad" value={search} onChange={setSearch} />
        <Select options={specialtyOptions} value={specialty} onChange={(event) => setSpecialty(event.target.value)} />
        <Select options={coverageOptions} value={coverage} onChange={(event) => setCoverage(event.target.value)} />
      </div>

      <div className="dashboard-plain-list">
        {filteredRows.map((professional) => (
          <ListEntry
            key={professional.id}
            title={professional.fullName}
            action={
              <>
                <Button
                  variant="ghost"
                  className="button-inline"
                  disabled={toggleTeamMutation.isPending}
                  onClick={() =>
                    toggleTeamMutation.mutate({
                      professionalId: professional.id,
                      isInTeam: professional.isInTeam,
                    })
                  }
                >
                  {professional.isInTeam ? "Quitar" : "Agregar"}
                </Button>
                <Link to={`/patient/professionals/${professional.id}`}>
                  <Button className="button-inline">Agenda</Button>
                </Link>
              </>
            }
          >
            <span className="slot-entry-meta">{professional.specialty}</span>
            <span className="slot-entry-meta">{professional.location}</span>
          </ListEntry>
        ))}

        {!filteredRows.length ? <span className="meta">No encontramos profesionales para esos filtros.</span> : null}
      </div>
    </div>
  );
}
