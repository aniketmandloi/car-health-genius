import { protectedProcedure, publicProcedure, router } from "../index";
import { adminRouter } from "./admin";
import { billingRouter } from "./billing";
import { bookingRouter } from "./booking";
import { diagnosticsRouter } from "./diagnostics";
import { estimatesRouter } from "./estimates";
import { feedbackRouter } from "./feedback";
import { kickoffRouter } from "./kickoff";
import { maintenanceRouter } from "./maintenance";
import { partnerPortalRouter } from "./partnerPortal";
import { recommendationsRouter } from "./recommendations";
import { supportRouter } from "./support";
import { todoRouter } from "./todo";
import { vehiclesRouter } from "./vehicles";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  privateData: protectedProcedure.query(({ ctx }) => {
    return {
      message: "This is private",
      user: ctx.session.user,
    };
  }),
  todo: todoRouter,
  kickoff: kickoffRouter,
  vehicles: vehiclesRouter,
  diagnostics: diagnosticsRouter,
  feedback: feedbackRouter,
  recommendations: recommendationsRouter,
  estimates: estimatesRouter,
  booking: bookingRouter,
  maintenance: maintenanceRouter,
  billing: billingRouter,
  support: supportRouter,
  admin: adminRouter,
  partnerPortal: partnerPortalRouter,
});
export type AppRouter = typeof appRouter;
