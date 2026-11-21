/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as auth from "../auth.js";
import type * as bookings from "../bookings.js";
import type * as catalog from "../catalog.js";
import type * as dishes from "../dishes.js";
import type * as http from "../http.js";
import type * as lib_access from "../lib/access.js";
import type * as lib_capacity from "../lib/capacity.js";
import type * as lib_dates from "../lib/dates.js";
import type * as lib_ledger from "../lib/ledger.js";
import type * as lib_policy from "../lib/policy.js";
import type * as lib_validation from "../lib/validation.js";
import type * as menus from "../menus.js";
import type * as setup from "../setup.js";
import type * as wallet from "../wallet.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  auth: typeof auth;
  bookings: typeof bookings;
  catalog: typeof catalog;
  dishes: typeof dishes;
  http: typeof http;
  "lib/access": typeof lib_access;
  "lib/capacity": typeof lib_capacity;
  "lib/dates": typeof lib_dates;
  "lib/ledger": typeof lib_ledger;
  "lib/policy": typeof lib_policy;
  "lib/validation": typeof lib_validation;
  menus: typeof menus;
  setup: typeof setup;
  wallet: typeof wallet;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">;
};
