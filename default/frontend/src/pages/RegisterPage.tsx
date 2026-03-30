/**
 * Responsibility: Implements the registration form with validation and automatic post-signup sign-in.
 */
import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { PageShell } from "../components/PageShell";
import { useAuth } from "../contexts/AuthContext";
import { getFieldErrors, registerFormSchema } from "../schemas/authSchemas";
import { getApiErrorMessage } from "../utils/api-errors";

interface RegisterFormValues {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export const RegisterPage = () => {
  const navigate = useNavigate();
  const { register, status, user } = useAuth();
  const [values, setValues] = useState<RegisterFormValues>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof RegisterFormValues, string>>
  >({});
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (status === "loading") {
    return <div className="status-banner">Checking your ShopSphere session...</div>;
  }

  if (status === "authenticated" && user) {
    return <Navigate replace to="/profile" />;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");

    const parsed = registerFormSchema.safeParse(values);

    if (!parsed.success) {
      setFieldErrors(getFieldErrors(parsed.error));
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      await register({
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        email: parsed.data.email,
        password: parsed.data.password,
      });
      navigate("/profile", { replace: true });
    } catch (error) {
      setFormError(getApiErrorMessage(error, "We couldn't create your account."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageShell
      eyebrow="Authentication"
      title="Create your ShopSphere account"
      description="Set up your customer account to save carts, manage wishlists, and track every order in one place."
    >
      <div className="auth-grid">
        <form className="form-card" onSubmit={handleSubmit}>
          <div className="form-grid form-grid--two-up">
            <label className="form-field">
              <span>First name</span>
              <input
                autoComplete="given-name"
                className="input"
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    firstName: event.target.value,
                  }))
                }
                type="text"
                value={values.firstName}
              />
              {fieldErrors.firstName ? (
                <small className="form-error">{fieldErrors.firstName}</small>
              ) : null}
            </label>

            <label className="form-field">
              <span>Last name</span>
              <input
                autoComplete="family-name"
                className="input"
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    lastName: event.target.value,
                  }))
                }
                type="text"
                value={values.lastName}
              />
              {fieldErrors.lastName ? (
                <small className="form-error">{fieldErrors.lastName}</small>
              ) : null}
            </label>

            <label className="form-field form-field--full">
              <span>Email</span>
              <input
                autoComplete="email"
                className="input"
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
                autoComplete="new-password"
                className="input"
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

            <label className="form-field">
              <span>Confirm password</span>
              <input
                autoComplete="new-password"
                className="input"
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    confirmPassword: event.target.value,
                  }))
                }
                type="password"
                value={values.confirmPassword}
              />
              {fieldErrors.confirmPassword ? (
                <small className="form-error">{fieldErrors.confirmPassword}</small>
              ) : null}
            </label>
          </div>

          {formError ? <p className="form-alert">{formError}</p> : null}

          <div className="form-actions">
            <button className="button-link button-link--solid" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Creating account..." : "Create account"}
            </button>
            <p className="form-help">
              Already registered? <Link to="/login">Sign in</Link>.
            </p>
          </div>
        </form>
      </div>
    </PageShell>
  );
};
