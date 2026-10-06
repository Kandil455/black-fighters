import test from "node:test";
import assert from "node:assert/strict";
import { PLANS } from "../../src/lib/plans.js";
import { hasEmergencyAccess } from "../../src/lib/emergencyAccess.js";

test("PLANS catalog includes emergency_round priced at 99 EGP", () => {
  const emergencyPlan = PLANS.find((p) => p.key === "emergency_round");
  assert.ok(emergencyPlan, "emergency_round plan must exist in PLANS");
  assert.equal(emergencyPlan.monthly, 99, "Emergency Round must cost exactly 99 EGP");
  assert.equal(emergencyPlan.credits, 100, "Emergency Round must grant 100 credits");
  assert.equal(emergencyPlan.isEmergency, true, "isEmergency must be true");
  assert.equal(emergencyPlan.tier, "emergency", "tier must be emergency");
});

test("hasEmergencyAccess grants access exclusively to Emergency subscribers and Admins", () => {
  // 1. Alpha / Owner / Admin always has access
  assert.equal(
    hasEmergencyAccess({ email: "ibrahimkandil000@gmail.com", role: "admin" }),
    true,
    "Alpha Owner must have full access"
  );
  assert.equal(
    hasEmergencyAccess({ role: "admin", email: "other@example.com" }),
    true,
    "Any admin role must have access"
  );

  // 2. Free users have NO access
  assert.equal(
    hasEmergencyAccess({ subscription_plan: "free", role: "user" }),
    false,
    "Free users must not have emergency access"
  );

  // 3. Pro and Supreme users have NO access (strictly standalone per Alpha rule)
  assert.equal(
    hasEmergencyAccess({ subscription_plan: "pro", subscription_plan_key: "pro", role: "user", subscription_status: "active" }),
    false,
    "Pro users must NOT have emergency round access without purchasing the standalone plan"
  );
  assert.equal(
    hasEmergencyAccess({ subscription_plan: "supreme", subscription_plan_key: "supreme", role: "user", subscription_status: "active" }),
    false,
    "Supreme users must NOT have emergency round access without purchasing the standalone plan"
  );

  // 4. Emergency Round subscriber with active status HAS access
  assert.equal(
    hasEmergencyAccess({
      subscription_plan_key: "emergency_round",
      subscription_status: "active",
      role: "user",
    }),
    true,
    "Active emergency_round subscriber must have access"
  );

  // 5. Emergency Round subscriber with valid unexpired date HAS access
  assert.equal(
    hasEmergencyAccess({
      subscription_plan_key: "emergency_round",
      subscription_status: "active",
      subscription_expires_at: new Date(Date.now() + 86400000).toISOString(),
      role: "user",
    }),
    true,
    "Future-dated emergency subscriber must have access"
  );

  // 6. Expired emergency subscriber has NO access
  assert.equal(
    hasEmergencyAccess({
      subscription_plan_key: "emergency_round",
      subscription_status: "expired",
      subscription_expires_at: new Date(Date.now() - 86400000).toISOString(),
      role: "user",
    }),
    false,
    "Expired emergency subscriber must NOT have access"
  );

  // 7. Pro user who ALSO purchased independent Emergency Round (has_emergency_round === true) HAS access
  assert.equal(
    hasEmergencyAccess({
      subscription_plan: "pro",
      subscription_plan_key: "pro",
      role: "user",
      subscription_status: "active",
      has_emergency_round: true,
      emergency_expires_at: new Date(Date.now() + 86400000).toISOString(),
    }),
    true,
    "Pro user with independent has_emergency_round flag must have full emergency access"
  );

  // 8. Starter user with expired emergency round add-on has NO emergency access
  assert.equal(
    hasEmergencyAccess({
      subscription_plan: "starter",
      subscription_plan_key: "starter",
      role: "user",
      subscription_status: "active",
      has_emergency_round: true,
      emergency_expires_at: new Date(Date.now() - 86400000).toISOString(),
    }),
    false,
    "Starter user with expired emergency add-on must lose emergency access"
  );
});
