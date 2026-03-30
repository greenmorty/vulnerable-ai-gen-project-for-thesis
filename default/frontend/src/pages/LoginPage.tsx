/**
 * Responsibility: Implements the login form with client validation and authenticated navigation handoff.
 */
import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";

import { PageShell } from "../components/PageShell";
import { useAuth } from "../contexts/AuthContext";
import { getFieldErrors, loginFormSchema } from "../schemas/authSchemas";
import { getApiErrorMessage } from "../utils/api-errors";

interface LoginFormValues {
  email: string;
  password: string;
}

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, status, user } = useAuth();
  const [values, setValues] = useState<LoginFormValues>({
    email: "",
    password: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof LoginFormValues, string>>>(
    {},
  );
  const [formError, setFormError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (status === "loading") {
    return <div className="status-banner">Checking your ShopSphere session...</div>;
  }

  if (status === "authenticated" && user) {
    return <Navigate replace to="/profile" />;
  }

  const redirectTo =
    typeof location.state === "object" &&
    location.state !== null &&
    "from" in location.state &&
    typeof location.state.from === "string"
      ? location.state.from
      : "/profile";

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");

    const parsed = loginFormSchema.safeParse(values);

    if (!parsed.success) {
      setFieldErrors(getFieldErrors(parsed.error));
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      await login(parsed.data);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setFormError(getApiErrorMessage(error, "We couldn't sign you in."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageShell
      eyebrow="Authentication"
      title="Welcome back to ShopSphere"
      description="Sign in to manage your orders, wishlists, checkout sessions, and profile settings."
    >
      <div className="auth-grid">
        <form className="form-card" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label className="form-field">
              <span>Email</span>
              <input
                autoComplete="email"
                className="input"
                name="email"
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                type="email"
                value={values.email}
              />
              {fieldErrors.email ? <small className="form-error">{fieldErrors.email}</small> : null}
            </label>

            <label className="form-field">
              <span>Password</span>
              <input
                autoComplete="current-password"
                className="input"
                name="password"
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
                type="password"
                value={values.password}
              />
              {fieldErrors.password ? (
                <small className="form-error">{fieldErrors.password}</small>
              ) : null}
            </label>
          </div>

          {formError ? <p className="form-alert">{formError}</p> : null}

          <div className="form-actions">
            <button className="button-link button-link--solid" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Signing in..." : "Sign in"}
            </button>
            <p className="form-help">
              New here? <Link to="/register">Create an account</Link>.
            </p>
          </div>
        </form>
      </div>
    </PageShell>
  );
};
