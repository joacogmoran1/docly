import { Outlet } from "react-router-dom";
import { appConfig } from "@/shared/config/app";

export function AuthLayout() {
  return (
    <div className="auth-layout">
      <section className="auth-hero">
        <div className="auth-hero-content stack-lg">
          <div className="brand-lockup">
            <div className="brand-mark">D</div>
            <div className="stack-sm">
              <strong>{appConfig.appName}</strong>
              <span className="meta">Salud digital simple</span>
            </div>
          </div>

          <div className="stack-lg">
            <span className="eyebrow">Compuerta de entrada</span>
            <h1 className="title-xl">
              Tu salud, simple y ordenada.
            </h1>
            <p className="meta">
              Un acceso claro para pacientes y profesionales independientes.
            </p>
          </div>
        </div>

        <div className="auth-hero-footer stack-md">
          <span className="meta">Una sola sesion activa por usuario.</span>
          <span className="meta">Informacion visible solo cuando la necesitas.</span>
        </div>
      </section>

      <section className="auth-form-shell">
        <Outlet />
      </section>
    </div>
  );
}
