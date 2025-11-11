/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as access from "../access.js";
import type * as auth from "../auth.js";
import type * as branchInventory from "../branchInventory.js";
import type * as branchTables from "../branchTables.js";
import type * as branches from "../branches.js";
import type * as categories from "../categories.js";
import type * as customProfile from "../customProfile.js";
import type * as http from "../http.js";
import type * as products from "../products.js";
import type * as sales from "../sales.js";
import type * as staff from "../staff.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  access: typeof access;
  auth: typeof auth;
  branchInventory: typeof branchInventory;
  branchTables: typeof branchTables;
  branches: typeof branches;
  categories: typeof categories;
  customProfile: typeof customProfile;
  http: typeof http;
  products: typeof products;
  sales: typeof sales;
  staff: typeof staff;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {};
