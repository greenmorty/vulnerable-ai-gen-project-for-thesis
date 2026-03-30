/**
 * Responsibility: Implements the protected customer profile page with editable account details.
 */
import { useEffect, useState } from "react";

import { PageShell } from "../components/PageShell";
import { useAuth } from "../contexts/AuthContext";
import { getFieldErrors, profileFormSchema } from "../schemas/authSchemas";
import { getApiErrorMessage } from "../utils/api-errors";

interface ProfileFormValues {
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string;
}

export const ProfilePage = () => {
  const { refreshProfile, updateProfile, user } = useAuth();
  const [values, setValues] = useState<ProfileFormValues>({
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    email: user?.email ?? "",
    avatarUrl: user?.avatarUrl ?? "",
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof ProfileFormValues, string>>>(
    {},
  );
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setValues({
      firstName: user?.firstName ?? "",
      lastName: user?.lastName ?? "",
      email: user?.email ?? "",
      avatarUrl: user?.avatarUrl ?? "",
    });
  }, [user]);

  useEffect(() => {
    void refreshProfile().catch(() => undefined);
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");
    setSuccessMessage("");

    const parsed = profileFormSchema.safeParse(values);

    if (!parsed.success) {
      setFieldErrors(getFieldErrors(parsed.error));
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const nextUser = await updateProfile({
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        email: parsed.data.email,
        avatarUrl: parsed.data.avatarUrl || null,
      });

      setValues({
        firstName: nextUser.firstName,
        lastName: nextUser.lastName,
        email: nextUser.email,
        avatarUrl: nextUser.avatarUrl ?? "",
      });
      setSuccessMessage("Your profile has been updated.");
    } catch (error) {
      setFormError(getApiErrorMessage(error, "We couldn't update your profile."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageShell
      eyebrow="Account"
      title="Your ShopSphere profile"
      description="Manage the identity details tied to your orders, wishlist activity, and future checkout sessions."
    >
      <div className="profile-grid">
        <section className="profile-summary">
          <div className="avatar-preview" aria-hidden="true">
            {user?.avatarUrl ? (
              <img alt={`${user.firstName} ${user.lastName}`} src={user.avatarUrl} />
            ) : (
              <span>{`${user?.firstName?.[0] ?? "S"}${user?.lastName?.[0] ?? "S"}`}</span>
            )}
          </div>
          <h2>
            {user?.firstName} {user?.lastName}
          </h2>
          <p>{user?.email}</p>
          <p className="profile-meta">Role: {user?.role}</p>
          <p className="profile-meta">Status: {user?.status}</p>
        </section>

        <form className="form-card" onSubmit={handleSubmit}>
          <div className="form-grid form-grid--two-up">
            <label className="form-field">
              <span>First name</span>
              <input
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

            <label className="form-field form-field--full">
              <span>Avatar URL</span>
              <input
                className="input"
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    avatarUrl: event.target.value,
                  }))
                }
                placeholder="https://example.com/avatar.jpg"
                type="url"
                value={values.avatarUrl}
              />
              {fieldErrors.avatarUrl ? (
                <small className="form-error">{fieldErrors.avatarUrl}</small>
              ) : null}
            </label>
          </div>

          {formError ? <p className="form-alert">{formError}</p> : null}
          {successMessage ? <p className="form-success">{successMessage}</p> : null}

          <div className="form-actions">
            <button className="button-link button-link--solid" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Saving..." : "Save profile"}
            </button>
          </div>
        </form>
      </div>
    </PageShell>
  );
};
