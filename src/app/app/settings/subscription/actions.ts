"use server";

/**
 * This file used to expose changePlanAction / cancelSubscriptionAction
 * that wrote to the local BusinessSubscription table. Those have been
 * removed: billing is handled by the certified provider (Wrapp), so
 * the app doesn't own the payment lifecycle. The subscription page
 * now links out to Wrapp for any plan or cancellation change.
 *
 * Server-side reconciliation (e.g. a Wrapp webhook that updates the
 * local BusinessSubscription row when the user changes plan upstream)
 * lives elsewhere.
 */
export {};
