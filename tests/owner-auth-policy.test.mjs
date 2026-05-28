import test from "node:test";
import assert from "node:assert/strict";

import {
  isOwnerIdentityAllowed,
  parseOwnerAllowlist
} from "../lib/auth/ownerPolicy.ts";

test("parses owner allowlists without exposing client-side env names", () => {
  assert.deepEqual(parseOwnerAllowlist(" user_1, user_2\nuser_3 "), [
    "user_1",
    "user_2",
    "user_3"
  ]);
  assert.deepEqual(parseOwnerAllowlist("OWNER@VISTAIRE.CA, owner@vistaire.ca"), [
    "owner@vistaire.ca"
  ]);
  assert.deepEqual(parseOwnerAllowlist(""), []);
  assert.deepEqual(parseOwnerAllowlist(undefined), []);
});

test("allows owners by Clerk user id or email allowlist only", () => {
  const env = {
    VISTAIRE_OWNER_USER_IDS: "user_owner,user_backup",
    VISTAIRE_OWNER_EMAILS: "owner@vistaire.ca,ops@vistaire.ca"
  };

  assert.equal(
    isOwnerIdentityAllowed({ userId: "user_owner", emailAddresses: [] }, env),
    true
  );
  assert.equal(
    isOwnerIdentityAllowed(
      { userId: "user_other", emailAddresses: ["OPS@VISTAIRE.CA"] },
      env
    ),
    true
  );
  assert.equal(
    isOwnerIdentityAllowed(
      { userId: "user_other", emailAddresses: ["guest@vistaire.ca"] },
      env
    ),
    false
  );
  assert.equal(
    isOwnerIdentityAllowed({ userId: null, emailAddresses: [] }, env),
    false
  );
});

test("does not fall back to NEXT_PUBLIC owner configuration", () => {
  assert.equal(
    isOwnerIdentityAllowed(
      { userId: "user_public", emailAddresses: ["public@vistaire.ca"] },
      {
        NEXT_PUBLIC_VISTAIRE_OWNER_USER_IDS: "user_public",
        NEXT_PUBLIC_VISTAIRE_OWNER_EMAILS: "public@vistaire.ca"
      }
    ),
    false
  );
});
