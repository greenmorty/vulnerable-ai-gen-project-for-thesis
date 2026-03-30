/**
 * Responsibility: Starts the Express HTTP server for the ShopSphere backend scaffold.
 */
import { app } from "./app";
import { env } from "./config/env";
import { paymentEventBus } from "./lib/payment-events";

paymentEventBus.on("payment.webhook", (payload) => {
  console.log("[payments] emitted simulated webhook", payload);
});

app.listen(env.port, () => {
  console.log(`ShopSphere API listening on http://localhost:${env.port}`);
});
