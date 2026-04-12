import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getPatientProfessionalsMock } from "@/mocks/docly-api";
import { queryKeys } from "@/shared/constants/query-keys";
import { ListEntry } from "@/shared/components/ListEntry";
import { SearchBar } from "@/shared/components/SearchBar";
import { Select } from "@/shared/ui/Select";
import { Button } from "@/shared/ui/Button";

export function PatientProfessionalsPage() {
  const [tab, setTab] = useState("team");
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState("all");
  const [zone, setZone] = useState("all");
  const [teamOverrides, setTeamOverrides] = useState<Record<string, boolean>>({});
  const query = useQuery({
    queryKey: queryKeys.patientProfessionals,
    queryFn: getPatientProfessionalsMock,
  });

  const professionals = useMemo(
    () =>
      (query.data ?? []).map((professional) => ({
        ...professional,
        isInTeam: teamOverrides[professional.id] ?? professional.isInTeam,
      })),
    [query.data, teamOverrides],
  );

  const specialtyOptions = useMemo(() => {
    const values = Array.from(new Set(professionals.map((item) => item.specialty)));
    return [{ value: "all", label: "Todas las especializaciones" }, ...values.map((value) => ({ value, label: value }))];
  }, [professionals]);

  const zoneOptions = useMemo(() => {
    const values = Array.from(
      new Set(professionals.map((item) => item.location.split(",")[0]?.trim() ?? item.location)),
    );
    return [{ value: "all", label: "Todas las zonas" }, ...values.map((value) => ({ value, label: value }))];
  }, [professionals]);

  const filteredRows = useMemo(() => {
    const items = professionals.filter((professional) => {
      const zoneValue = professional.location.split(",")[0]?.trim() ?? professional.location;
      const matchesSearch =
        professional.fullName.toLowerCase().includes(search.toLowerCase()) ||
        professional.specialty.toLowerCase().includes(search.toLowerCase());
      const matchesSpecialty = specialty === "all" || professional.specialty === specialty;
      const matchesZone = zone === "all" || zoneValue === zone;
      const matchesTab = tab === "team" ? professional.isInTeam : true;

      return matchesSearch && matchesSpecialty && matchesZone && matchesTab;
    });

    if (tab === "discover") {
      return items.sort((a, b) => Number(b.isInTeam) - Number(a.isInTeam));
    }

    return items;
  }, [professionals, search, specialty, tab, zone]);

  if (query.isLoading) return <div className="centered-feedback">Cargando profesionales...</div>;
  if (query.isError || !query.data) return <div className="centered-feedback">No pudimos cargar profesionales.</div>;

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
        <Select options={zoneOptions} value={zone} onChange={(event) => setZone(event.target.value)} />
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
                  onClick={() =>
                    setTeamOverrides((current) => ({
                      ...current,
                      [professional.id]: !professional.isInTeam,
                    }))
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
