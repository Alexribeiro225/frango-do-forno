import { describe, expect, it } from "vitest";
import { assertDeletableUser } from "@/lib/user-deletion";

describe("Master user deletion protections", () => {
  it("rejects deleting the current administrator", () => {
    expect(() => assertDeletableUser("master", { id: "master" })).toThrow();
  });
  it("rejects deleting the master account even under a different ID", () => {
    expect(() => assertDeletableUser("caller", { id: "master", email: "conectstore.app@gmail.com" })).toThrow();
  });
  it("allows deleting a customer account", () => {
    expect(() => assertDeletableUser("master", { id: "customer", email: "customer@example.com" })).not.toThrow();
  });
});