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
import type * as analytics from "../analytics.js";
import type * as auth from "../auth.js";
import type * as bookings from "../bookings.js";
import type * as catalog from "../catalog.js";
import type * as copilot from "../copilot.js";
import type * as counter from "../counter.js";
import type * as crons from "../crons.js";
import type * as dishes from "../dishes.js";
import type * as habits from "../habits.js";
import type * as http from "../http.js";
import type * as lib_access from "../lib/access.js";
import type * as lib_aiQuota from "../lib/aiQuota.js";
import type * as lib_allergens from "../lib/allergens.js";
import type * as lib_allergies from "../lib/allergies.js";
import type * as lib_analytics from "../lib/analytics.js";
import type * as lib_booking from "../lib/booking.js";
import type * as lib_capacity from "../lib/capacity.js";
import type * as lib_copilot_brief from "../lib/copilot/brief.js";
import type * as lib_copilot_facts from "../lib/copilot/facts.js";
import type * as lib_copilot_llm from "../lib/copilot/llm.js";
import type * as lib_csv from "../lib/csv.js";
import type * as lib_dates from "../lib/dates.js";
import type * as lib_ledger from "../lib/ledger.js";
import type * as lib_locale from "../lib/locale.js";
import type * as lib_lowBalance from "../lib/lowBalance.js";
import type * as lib_names from "../lib/names.js";
import type * as lib_notifications from "../lib/notifications.js";
import type * as lib_pass from "../lib/pass.js";
import type * as lib_policy from "../lib/policy.js";
import type * as lib_production_history from "../lib/production/history.js";
import type * as lib_production_load from "../lib/production/load.js";
import type * as lib_production_plan from "../lib/production/plan.js";
import type * as lib_production_returns from "../lib/production/returns.js";
import type * as lib_production_waste from "../lib/production/waste.js";
import type * as lib_returns from "../lib/returns.js";
import type * as lib_slots from "../lib/slots.js";
import type * as lib_smartMenu_contract from "../lib/smartMenu/contract.js";
import type * as lib_smartMenu_llm from "../lib/smartMenu/llm.js";
import type * as lib_smartMenu_providers from "../lib/smartMenu/providers.js";
import type * as lib_smartMenu_rules from "../lib/smartMenu/rules.js";
import type * as lib_stock_load from "../lib/stock/load.js";
import type * as lib_stock_position from "../lib/stock/position.js";
import type * as lib_stock_units from "../lib/stock/units.js";
import type * as lib_validation from "../lib/validation.js";
import type * as lib_waitlist from "../lib/waitlist.js";
import type * as menus from "../menus.js";
import type * as notificationPreferences from "../notificationPreferences.js";
import type * as passes from "../passes.js";
import type * as production from "../production.js";
import type * as productionPlan from "../productionPlan.js";
import type * as push from "../push.js";
import type * as pushSend from "../pushSend.js";
import type * as ratings from "../ratings.js";
import type * as reminders from "../reminders.js";
import type * as settings from "../settings.js";
import type * as setup from "../setup.js";
import type * as smartMenu from "../smartMenu.js";
import type * as stock from "../stock.js";
import type * as waitlist from "../waitlist.js";
import type * as wallet from "../wallet.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  account: typeof account;
  admin: typeof admin;
  analytics: typeof analytics;
  auth: typeof auth;
  bookings: typeof bookings;
  catalog: typeof catalog;
  copilot: typeof copilot;
  counter: typeof counter;
  crons: typeof crons;
  dishes: typeof dishes;
  habits: typeof habits;
  http: typeof http;
  "lib/access": typeof lib_access;
  "lib/aiQuota": typeof lib_aiQuota;
  "lib/allergens": typeof lib_allergens;
  "lib/allergies": typeof lib_allergies;
  "lib/analytics": typeof lib_analytics;
  "lib/booking": typeof lib_booking;
  "lib/capacity": typeof lib_capacity;
  "lib/copilot/brief": typeof lib_copilot_brief;
  "lib/copilot/facts": typeof lib_copilot_facts;
  "lib/copilot/llm": typeof lib_copilot_llm;
  "lib/csv": typeof lib_csv;
  "lib/dates": typeof lib_dates;
  "lib/ledger": typeof lib_ledger;
  "lib/locale": typeof lib_locale;
  "lib/lowBalance": typeof lib_lowBalance;
  "lib/names": typeof lib_names;
  "lib/notifications": typeof lib_notifications;
  "lib/pass": typeof lib_pass;
  "lib/policy": typeof lib_policy;
  "lib/production/history": typeof lib_production_history;
  "lib/production/load": typeof lib_production_load;
  "lib/production/plan": typeof lib_production_plan;
  "lib/production/returns": typeof lib_production_returns;
  "lib/production/waste": typeof lib_production_waste;
  "lib/returns": typeof lib_returns;
  "lib/slots": typeof lib_slots;
  "lib/smartMenu/contract": typeof lib_smartMenu_contract;
  "lib/smartMenu/llm": typeof lib_smartMenu_llm;
  "lib/smartMenu/providers": typeof lib_smartMenu_providers;
  "lib/smartMenu/rules": typeof lib_smartMenu_rules;
  "lib/stock/load": typeof lib_stock_load;
  "lib/stock/position": typeof lib_stock_position;
  "lib/stock/units": typeof lib_stock_units;
  "lib/validation": typeof lib_validation;
  "lib/waitlist": typeof lib_waitlist;
  menus: typeof menus;
  notificationPreferences: typeof notificationPreferences;
  passes: typeof passes;
  production: typeof production;
  productionPlan: typeof productionPlan;
  push: typeof push;
  pushSend: typeof pushSend;
  ratings: typeof ratings;
  reminders: typeof reminders;
  settings: typeof settings;
  setup: typeof setup;
  smartMenu: typeof smartMenu;
  stock: typeof stock;
  waitlist: typeof waitlist;
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
