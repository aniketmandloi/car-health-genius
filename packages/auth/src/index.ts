import { expo } from "@better-auth/expo";
import { db } from "@car-health-genius/db";
import * as schema from "@car-health-genius/db/schema/auth";
import { env } from "@car-health-genius/env/server";
import { checkout, polar, portal, webhooks } from "@polar-sh/better-auth";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";

import { polarClient } from "./lib/payments";
import { handlePolarWebhookPayload } from "./lib/webhooks";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",

    schema: schema,
  }),
  trustedOrigins: [
    env.CORS_ORIGIN,
    "mybettertapp://",
    ...(env.NODE_ENV === "development"
      ? ["exp://", "exp://**", "exp://192.168.*.*:*/**", "http://localhost:8081"]
      : []),
  ],
  emailAndPassword: {
    enabled: true,
  },
  advanced: {
    defaultCookieAttributes: {
      sameSite: "none",
      secure: true,
      httpOnly: true,
    },
  },
  plugins: [
    admin({
      defaultRole: "user",
      adminRoles: ["admin"],
    }),
    polar({
      client: polarClient,
      createCustomerOnSignUp: true,
      enableCustomerPortal: true,
      use: [
        checkout({
          products: [
            {
              productId: env.POLAR_PRODUCT_ID_PRO_MONTHLY,
              slug: "pro",
            },
            {
              productId: env.POLAR_PRODUCT_ID_PRO_ANNUAL,
              slug: "pro-annual",
            },
          ],
          successUrl: env.POLAR_SUCCESS_URL,
          authenticatedUsersOnly: true,
        }),
        portal(),
        webhooks({
          secret: env.POLAR_WEBHOOK_SECRET,
          onPayload: async (payload) => {
            await handlePolarWebhookPayload(payload);
          },
        }),
      ],
    }),
    expo(),
  ],
});
