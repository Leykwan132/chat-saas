import { execFileSync, spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"
import path from "node:path"

const requiredEnvironmentKeys = [
  "CONVEX_DEPLOYMENT",
  "VITE_CONVEX_SITE_URL",
  "VITE_CONVEX_URL",
  "VITE_INSTAGRAM_APP_ID",
  "VITE_INSTAGRAM_GRAPH_API_VERSION",
  "VITE_MEDIA_CDN_BASE_URL",
  "VITE_MESSENGER_CODE_EXCHANGE_REDIRECT_URI",
  "VITE_MESSENGER_CONFIG_ID",
  "VITE_META_APP_ID",
  "VITE_META_EMBEDDED_SIGNUP_CONFIG_ID",
  "VITE_META_GRAPH_API_VERSION",
  "VITE_PUBLIC_POSTHOG_HOST",
  "VITE_PUBLIC_POSTHOG_PROJECT_TOKEN",
  "VITE_AVATAR_EMBED_BASE_URL",
  "VITE_WHATSAPP_CODE_EXCHANGE_REDIRECT_URI",
  "VITE_WHATSAPP_REDIRECT_URI",
  "VITE_WIDGET_SCRIPT_URL",
  "VITE_WORKOS_CLIENT_ID",
  "VITE_WORKOS_REDIRECT_URI",
]

const deploymentTargets = {
  dev: {
    branch: "dev",
    buildScript: "build:dev",
    environmentFile: ".env.dev",
    wranglerEnvironment: "dev",
  },
  production: {
    branch: "main",
    buildScript: "build:prod",
    environmentFile: ".env.production",
    wranglerEnvironment: "production",
  },
}

function fail(message) {
  process.stderr.write(`${message}\n`)
  process.exit(1)
}

function run(command, args, environment) {
  const result = spawnSync(command, args, {
    env: environment,
    stdio: "inherit",
  })
  if (result.error) {
    fail(result.error.message)
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

function readConfiguredKeys(environmentFile) {
  const contents = readFileSync(environmentFile, "utf8")
  return new Map(
    contents
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const separator = line.indexOf("=")
        return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()]
      }),
  )
}

const targetName = process.argv[2]
const target = deploymentTargets[targetName]

if (!target) {
  fail("Deployment target must be dev or production")
}

const currentBranch = execFileSync("git", ["branch", "--show-current"], {
  encoding: "utf8",
}).trim()

if (currentBranch !== target.branch) {
  const label = targetName === "production" ? "Production" : "Development"
  fail(`${label} deployments must run from the ${target.branch} branch`)
}

const environmentFile = path.resolve(target.environmentFile)
let configuredKeys

try {
  configuredKeys = readConfiguredKeys(environmentFile)
} catch {
  fail(`Missing ${target.environmentFile}`)
}

const missingKeys = requiredEnvironmentKeys.filter(
  (key) => !configuredKeys.get(key),
)

if (missingKeys.length > 0) {
  fail(`Missing required values in ${target.environmentFile}: ${missingKeys.join(", ")}`)
}

const deploymentEnvironment = {
  ...process.env,
  CLOUDFLARE_ENV: target.wranglerEnvironment,
}

run("bun", ["run", target.buildScript], deploymentEnvironment)
run(
  "bunx",
  ["wrangler", "deploy", "--env", target.wranglerEnvironment],
  deploymentEnvironment,
)
