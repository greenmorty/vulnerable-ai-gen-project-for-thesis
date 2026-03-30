/**
 * Responsibility: Implements the checkout flow with address capture, order creation, and simulated payment submission.
 */
import { type FormEvent, startTransition, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { PageShell } from "../components/PageShell";
import { apiClient } from "../lib/api";
import {
  checkoutFormSchema,
  getNestedFieldErrors,
  type AddressFormValues,
  type CheckoutFormValues,
} from "../schemas/commerceSchemas";
import type {
  Cart,
  CartResponse,
  OrderResponse,
  PaymentMethod,
  PaymentSimulationResponse,
} from "../types/commerce";
import { getApiErrorMessage } from "../utils/api-errors";

const createEmptyAddress = (): AddressFormValues => ({
  fullName: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
  phone: "",
});

const createInitialValues = (): CheckoutFormValues => ({
  shippingAddress: createEmptyAddress(),
  billingAddress: createEmptyAddress(),
  billingSameAsShipping: true,
  paymentMethod: "CARD",
  notes: "",
});

const formatMoney = (currency: string, amount: number) => `${currency} ${amount.toFixed(2)}`;

export const CheckoutPage = () => {
  const navigate = useNavigate();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [values, setValues] = useState<CheckoutFormValues>(createInitialValues);

  const fetchCart = async () => {
    setLoading(true);
    setFormError("");

    try {
      const { data } = await apiClient.get<CartResponse>("/cart");
      setCart(data.cart);
    } catch (fetchError) {
      setFormError(getApiErrorMessage(fetchError, "We couldn't load your cart for checkout."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchCart();
  }, []);

  const setAddressValue = (
    key: "shippingAddress" | "billingAddress",
    field: keyof AddressFormValues,
    value: string,
  ) => {
    setValues((current) => ({
      ...current,
      [key]: {
        ...current[key],
        [field]: value,
      },
    }));
  };

  const buildOrderPayload = (parsedValues: CheckoutFormValues) => {
    const shippingAddress = {
      ...parsedValues.shippingAddress,
      line2: parsedValues.shippingAddress.line2 || undefined,
      state: parsedValues.shippingAddress.state || undefined,
      phone: parsedValues.shippingAddress.phone || undefined,
    };

    const billingSource = parsedValues.billingSameAsShipping
      ? parsedValues.shippingAddress
      : parsedValues.billingAddress;
    const billingAddress = {
      ...billingSource,
      line2: billingSource.line2 || undefined,
      state: billingSource.state || undefined,
      phone: billingSource.phone || undefined,
    };

    return {
      shippingAddress,
      billingAddress,
      notes: parsedValues.notes || undefined,
    };
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");

    const candidateValues: CheckoutFormValues = values.billingSameAsShipping
      ? {
          ...values,
          billingAddress: values.shippingAddress,
        }
      : values;
    const parsed = checkoutFormSchema.safeParse(candidateValues);

    if (!parsed.success) {
      setFieldErrors(getNestedFieldErrors(parsed.error));
      return;
    }

    setFieldErrors({});
    setSubmitting(true);

    try {
      const orderPayload = buildOrderPayload(parsed.data);
      const { data: orderData } = await apiClient.post<OrderResponse>("/orders", orderPayload);
      await apiClient.post<PaymentSimulationResponse>("/payments/simulate", {
        orderId: orderData.order.id,
        paymentMethod: parsed.data.paymentMethod,
      });

      startTransition(() => {
        navigate(`/orders/${orderData.order.id}`);
      });
    } catch (submitError) {
      setFormError(getApiErrorMessage(submitError, "We couldn't complete checkout."));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <PageShell
        eyebrow="Checkout"
        title="Checkout"
        description="Review your order and finish payment."
      >
        <div className="status-banner">Preparing your checkout session...</div>
      </PageShell>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <PageShell
        eyebrow="Checkout"
        title="Your cart is empty"
        description="Add at least one product before starting checkout."
      >
        <div className="empty-state">
          <p>Once your cart has items, you'll be able to capture shipping details and simulate payment from here.</p>
          <div className="inline-actions">
            <Link className="button-link button-link--solid" to="/products">
              Browse products
            </Link>
            <Link className="button-link" to="/cart">
              Back to cart
            </Link>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      eyebrow="Checkout"
      title="Complete your order"
      description="Enter shipping and billing details, then place the order through the ShopSphere simulated payment gateway."
    >
      <form className="commerce-layout" onSubmit={handleSubmit}>
        <section className="commerce-panel commerce-panel--list">
          <div className="commerce-panel">
            <h2>Shipping address</h2>
            <div className="form-grid form-grid--two-up">
              <label className="form-field">
                <span>Full name</span>
                <input
                  className="input"
                  onChange={(event) =>
                    setAddressValue("shippingAddress", "fullName", event.target.value)
                  }
                  value={values.shippingAddress.fullName}
                />
                {fieldErrors["shippingAddress.fullName"] ? (
                  <small className="form-error">{fieldErrors["shippingAddress.fullName"]}</small>
                ) : null}
              </label>

              <label className="form-field">
                <span>Phone</span>
                <input
                  className="input"
                  onChange={(event) => setAddressValue("shippingAddress", "phone", event.target.value)}
                  value={values.shippingAddress.phone}
                />
                {fieldErrors["shippingAddress.phone"] ? (
                  <small className="form-error">{fieldErrors["shippingAddress.phone"]}</small>
                ) : null}
              </label>

              <label className="form-field form-field--full">
                <span>Address line 1</span>
                <input
                  className="input"
                  onChange={(event) => setAddressValue("shippingAddress", "line1", event.target.value)}
                  value={values.shippingAddress.line1}
                />
                {fieldErrors["shippingAddress.line1"] ? (
                  <small className="form-error">{fieldErrors["shippingAddress.line1"]}</small>
                ) : null}
              </label>

              <label className="form-field form-field--full">
                <span>Address line 2</span>
                <input
                  className="input"
                  onChange={(event) => setAddressValue("shippingAddress", "line2", event.target.value)}
                  value={values.shippingAddress.line2}
                />
              </label>

              <label className="form-field">
                <span>City</span>
                <input
                  className="input"
                  onChange={(event) => setAddressValue("shippingAddress", "city", event.target.value)}
                  value={values.shippingAddress.city}
                />
                {fieldErrors["shippingAddress.city"] ? (
                  <small className="form-error">{fieldErrors["shippingAddress.city"]}</small>
                ) : null}
              </label>

              <label className="form-field">
                <span>State / Region</span>
                <input
                  className="input"
                  onChange={(event) => setAddressValue("shippingAddress", "state", event.target.value)}
                  value={values.shippingAddress.state}
                />
              </label>

              <label className="form-field">
                <span>Postal code</span>
                <input
                  className="input"
                  onChange={(event) =>
                    setAddressValue("shippingAddress", "postalCode", event.target.value)
                  }
                  value={values.shippingAddress.postalCode}
                />
                {fieldErrors["shippingAddress.postalCode"] ? (
                  <small className="form-error">{fieldErrors["shippingAddress.postalCode"]}</small>
                ) : null}
              </label>

              <label className="form-field">
                <span>Country</span>
                <input
                  className="input"
                  onChange={(event) => setAddressValue("shippingAddress", "country", event.target.value)}
                  value={values.shippingAddress.country}
                />
                {fieldErrors["shippingAddress.country"] ? (
                  <small className="form-error">{fieldErrors["shippingAddress.country"]}</small>
                ) : null}
              </label>
            </div>
          </div>

          <div className="commerce-panel">
            <div className="section-heading">
              <div>
                <h2>Billing address</h2>
                <p className="profile-meta">Use the same billing details as shipping if you want a faster checkout.</p>
              </div>
              <label className="checkbox-row">
                <input
                  checked={values.billingSameAsShipping}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      billingSameAsShipping: event.target.checked,
                    }))
                  }
                  type="checkbox"
                />
                <span>Same as shipping</span>
              </label>
            </div>

            <div className="form-grid form-grid--two-up">
              {(
                [
                  ["fullName", "Full name"],
                  ["phone", "Phone"],
                  ["line1", "Address line 1"],
                  ["line2", "Address line 2"],
                  ["city", "City"],
                  ["state", "State / Region"],
                  ["postalCode", "Postal code"],
                  ["country", "Country"],
                ] as const
              ).map(([field, label]) => (
                <label
                  className={
                    field === "line1" || field === "line2"
                      ? "form-field form-field--full"
                      : "form-field"
                  }
                  key={field}
                >
                  <span>{label}</span>
                  <input
                    className="input"
                    disabled={values.billingSameAsShipping}
                    onChange={(event) => setAddressValue("billingAddress", field, event.target.value)}
                    value={values.billingSameAsShipping ? values.shippingAddress[field] : values.billingAddress[field]}
                  />
                  {fieldErrors[`billingAddress.${field}`] && !values.billingSameAsShipping ? (
                    <small className="form-error">{fieldErrors[`billingAddress.${field}`]}</small>
                  ) : null}
                </label>
              ))}
            </div>
          </div>

          <div className="commerce-panel">
            <h2>Payment</h2>
            <div className="form-grid form-grid--two-up">
              <label className="form-field">
                <span>Payment method</span>
                <select
                  className="input"
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      paymentMethod: event.target.value as PaymentMethod,
                    }))
                  }
                  value={values.paymentMethod}
                >
                  <option value="CARD">Card</option>
                  <option value="PAYPAL">PayPal</option>
                  <option value="WALLET">Wallet</option>
                  <option value="BANK_TRANSFER">Bank transfer</option>
                  <option value="CASH_ON_DELIVERY">Cash on delivery</option>
                </select>
                {fieldErrors.paymentMethod ? (
                  <small className="form-error">{fieldErrors.paymentMethod}</small>
                ) : null}
              </label>

              <label className="form-field form-field--full">
                <span>Order notes</span>
                <textarea
                  className="input input--textarea"
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  rows={4}
                  value={values.notes}
                />
              </label>
            </div>
          </div>
        </section>

        <aside className="commerce-sidebar">
          <section className="commerce-panel">
            <h2>Order review</h2>
            <div className="summary-lines">
              {cart.items.map((item) => (
                <div className="summary-line" key={item.id}>
                  <span>
                    {item.product.name} x {item.quantity}
                  </span>
                  <strong>{formatMoney(cart.currency, item.lineTotal)}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="commerce-panel">
            <h2>Totals</h2>
            <div className="summary-lines">
              <div className="summary-line">
                <span>Subtotal</span>
                <strong>{formatMoney(cart.currency, cart.subtotal)}</strong>
              </div>
              <div className="summary-line">
                <span>Discount</span>
                <strong>-{formatMoney(cart.currency, cart.discountTotal)}</strong>
              </div>
              <div className="summary-line">
                <span>Shipping</span>
                <strong>{formatMoney(cart.currency, cart.shippingTotal)}</strong>
              </div>
              <div className="summary-line">
                <span>Tax</span>
                <strong>{formatMoney(cart.currency, cart.taxTotal)}</strong>
              </div>
              <div className="summary-line summary-line--total">
                <span>Total</span>
                <strong>{formatMoney(cart.currency, cart.grandTotal)}</strong>
              </div>
            </div>

            {formError ? <p className="form-alert">{formError}</p> : null}

            <div className="inline-actions">
              <button className="button-link button-link--solid" disabled={submitting} type="submit">
                {submitting ? "Processing..." : "Place order and simulate payment"}
              </button>
              <Link className="button-link" to="/cart">
                Back to cart
              </Link>
            </div>
          </section>
        </aside>
      </form>
    </PageShell>
  );
};
