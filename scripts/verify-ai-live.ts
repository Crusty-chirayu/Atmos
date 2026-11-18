import { OpenRouterAdapter } from "../src/lib/ai/providers/openrouter/adapter";
import * as fs from "fs";
import * as path from "path";

try {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
        const [k, ...v] = trimmed.split("=");
        process.env[k.trim()] = v
          .join("=")
          .trim()
          .replace(/^["']|["']$/g, "");
      }
    }
  }
} catch {
  // Ignore
}

async function runVerification() {
  console.log("=== Testing OpenRouter Integration ===");
  const apiKey = process.env.OPENROUTER_API_KEY || "";
  const model =
    process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct";
  console.log(
    "Configured key present:",
    Boolean(apiKey && !apiKey.includes("your-"))
  );
  console.log("Configured model:", model);

  const adapter = new OpenRouterAdapter({ apiKey, model });
  console.log("Adapter isConfigured():", adapter.isConfigured());

  // Test 1: Math / General knowledge
  console.log("\n--- Test 1: Math Query (15% of 800) ---");
  const mathRes = await adapter.generateCompletion(
    "What is 15% of 800? Reply in one short sentence."
  );
  console.log("Model:", mathRes.model);
  console.log("Response:", mathRes.content);

  // Test 2: Travel Planning Guidance
  console.log("\n--- Test 2: Travel Guidance ---");
  const travelRes = await adapter.generateCompletion(
    "I am in Bangalore and travelling to Mumbai tomorrow. What should I pack?",
    {
      systemInstruction:
        "You are the ATMOS Meteorological AI. Give clear, concise packing and weather advice.",
    }
  );
  console.log("Model:", travelRes.model);
  console.log("Response Preview:", travelRes.content.slice(0, 200) + "...");

  console.log("\n=== OpenRouter Live Verification Completed Successfully! ===");
}

runVerification().catch((err) => {
  console.error("Live test failed:", err);
  process.exit(1);
});
