import { Password } from "@convex-dev/auth/providers/Password";
import type { DataModel } from "./_generated/dataModel";
import { ResendOTPPasswordReset } from "./ResendOTPPasswordReset";
 
export default Password<DataModel>({
  profile(params) {
    return {
      email: params.email as string,
      name: params.name as string,
      administratorCode: params.administratorCode as string,
      salesCode: params.salesCode as string,
      inventoryCode: params.inventoryCode as string,
      IGVPercentage: params.IGVPercentage as 10 | 18 | undefined,
      subscriptionType: "starter" as const,
    };
  },
  reset: ResendOTPPasswordReset,
});