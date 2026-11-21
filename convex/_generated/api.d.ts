/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as account from "../account.js";
import type * as admin from "../admin.js";
import type * as auth from "../auth.js";
import type * as bookings from "../bookings.js";
import type * as catalog from "../catalog.js";
import type * as crons from "../crons.js";
import type * as dishes from "../dishes.js";
import type * as http from "../http.js";
import type * as lib_access from "../lib/access.js";
import type * as lib_allergens from "../lib/allergens.js";
import type * as lib_capacity from "../lib/capacity.js";
import type * as lib_dates from "../lib/dates.js";
import type * as lib_ledger from "../lib/ledger.js";
import type * as lib_locale from "../lib/locale.js";
import type * as lib_lowBalance from "../lib/lowBalance.js";
import type * as lib_notifications from "../lib/notifications.js";
import type * as lib_policy from "../lib/policy.js";
import type * as lib_returns from "../lib/returns.js";
import type * as lib_smartMenu_contract from "../lib/smartMenu/contract.js";
import type * as lib_smartMenu_llm from "../lib/smartMenu/llm.js";
import type * as lib_smartMenu_providers from "../lib/smartMenu/providers.js";
import type * as lib_smartMenu_rules from "../lib/smartMenu/rules.js";
import type * as lib_validation from "../lib/validation.js";
import type * as menus from "../menus.js";
import type * as notificationPreferences from "../notificationPreferences.js";
import type * as push from "../push.js";
import type * as pushSend from "../pushSend.js";
import type * as reminders from "../reminders.js";
import type * as setup from "../setup.js";
import type * as smartMenu from "../smartMenu.js";
import type * as wallet from "../wallet.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  account: typeof account;
  admin: typeof admin;
  auth: typeof auth;
  bookings: typeof bookings;
  catalog: typeof catalog;
  crons: typeof crons;
  dishes: typeof dishes;
  http: typeof http;
  "lib/access": typeof lib_access;
  "lib/allergens": typeof lib_allergens;
  "lib/capacity": typeof lib_capacity;
  "lib/dates": typeof lib_dates;
  "lib/ledger": typeof lib_ledger;
  "lib/locale": typeof lib_locale;
  "lib/lowBalance": typeof lib_lowBalance;
  "lib/notifications": typeof lib_notifications;
  "lib/policy": typeof lib_policy;
  "lib/returns": typeof lib_returns;
  "lib/smartMenu/contract": typeof lib_smartMenu_contract;
  "lib/smartMenu/llm": typeof lib_smartMenu_llm;
  "lib/smartMenu/providers": typeof lib_smartMenu_providers;
  "lib/smartMenu/rules": typeof lib_smartMenu_rules;
  "lib/validation": typeof lib_validation;
  menus: typeof menus;
  notificationPreferences: typeof notificationPreferences;
  push: typeof push;
  pushSend: typeof pushSend;
  reminders: typeof reminders;
  setup: typeof setup;
  smartMenu: typeof smartMenu;
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
