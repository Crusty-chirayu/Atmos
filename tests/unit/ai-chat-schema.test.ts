import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AiChatRequestSchema } from "@/lib/ai/domain/schemas";

describe("AiChatRequestSchema", () => {
  it("validates a standard user chat prompt", () => {
    const input = {
      message: "Will it rain this afternoon in London?",
      location: {
        name: "London",
        latitude: 51.5074,
        longitude: -0.1278,
      },
      mode: "general",
    };

    const parsed = AiChatRequestSchema.parse(input);
    assert.equal(parsed.message, "Will it rain this afternoon in London?");
    assert.equal(parsed.mode, "general");
    assert.equal(parsed.location?.name, "London");
  });

  it("trims whitespace from messages", () => {
    const input = {
      message: "   Is it cold today?   ",
    };

    const parsed = AiChatRequestSchema.parse(input);
    assert.equal(parsed.message, "Is it cold today?");
  });

  it("rejects empty or whitespace-only messages", () => {
    assert.throws(
      () => AiChatRequestSchema.parse({ message: "" }),
      /Message cannot be empty/
    );

    assert.throws(
      () => AiChatRequestSchema.parse({ message: "    " }),
      /Message cannot be empty/
    );
  });

  it("rejects messages exceeding 1,000 characters", () => {
    const longMessage = "a".repeat(1001);
    assert.throws(
      () => AiChatRequestSchema.parse({ message: longMessage }),
      /Message cannot exceed 1,000 characters/
    );
  });

  it("accepts planning and comparison modes", () => {
    const planning = AiChatRequestSchema.parse({
      message: "Best time for hiking?",
      mode: "planning",
    });
    assert.equal(planning.mode, "planning");

    const comparison = AiChatRequestSchema.parse({
      message: "Compare with Tokyo",
      mode: "comparison",
      comparisonLocation: {
        name: "Tokyo",
        latitude: 35.6762,
        longitude: 139.6503,
      },
    });
    assert.equal(comparison.mode, "comparison");
    assert.equal(comparison.comparisonLocation?.name, "Tokyo");
  });

  it("rejects invalid location coordinates", () => {
    assert.throws(
      () =>
        AiChatRequestSchema.parse({
          message: "Valid question",
          location: {
            name: "Out of bounds",
            latitude: 105,
            longitude: 0,
          },
        }),
      (err: any) => err.name === "ZodError"
    );
  });
});
