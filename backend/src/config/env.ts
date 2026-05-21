import "dotenv/config";

function readRequiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function readCorsOrigins() {
  const raw = process.env.CORS_ORIGIN?.trim();

  if (!raw) {
    return null;
  }

  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function compileCorsOriginPatterns(origins: string[] | null) {
  if (!origins) {
    return null;
  }

  return origins.map((origin) => {
    if (!origin.includes("*")) {
      return origin;
    }

    const pattern = `^${origin.split("*").map(escapeRegex).join(".*")}$`;
    return new RegExp(pattern);
  });
}

const nodeEnv = process.env.NODE_ENV ?? "development";
const isProduction = nodeEnv === "production";
const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST?.trim() || "0.0.0.0";
const jwtSecret = isProduction
  ? readRequiredEnv("JWT_SECRET")
  : process.env.JWT_SECRET?.trim() || "secret-dev";
const databaseUrl = readRequiredEnv("DATABASE_URL");
const groqApiKey = process.env.GROQ_API_KEY?.trim() || null;
const corsOrigins = readCorsOrigins();
const corsOriginPatterns = compileCorsOriginPatterns(corsOrigins);

export const env = {
  nodeEnv,
  isProduction,
  port,
  host,
  jwtSecret,
  databaseUrl,
  groqApiKey,
  corsOrigins,
  corsOriginPatterns,
};
