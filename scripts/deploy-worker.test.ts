import { execFileSync, spawnSync } from "node:child_process"
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { describe, expect, it } from "vitest"

const deployScript = path.resolve("scripts/deploy-worker.mjs")
const requiredEnvironment = [
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

function createDeploymentFixture(branch: string) {
  const directory = mkdtempSync(path.join(tmpdir(), "kilobot-deploy-"))
  const binDirectory = path.join(directory, "bin")
  const commandLog = path.join(directory, "commands.log")

  execFileSync("mkdir", [binDirectory])
  execFileSync("git", ["init", "-q"], { cwd: directory })
  execFileSync("git", ["checkout", "-q", "-b", branch], { cwd: directory })

  for (const command of ["bun", "bunx"]) {
    const executable = path.join(binDirectory, command)
    writeFileSync(executable, `#!/bin/sh\nprintf '%s [%s] %s\\n' '${command}' "$CLOUDFLARE_ENV" "$*" >> "$COMMAND_LOG"\n`)
    chmodSync(executable, 0o755)
  }

  return {
    commandLog,
    directory,
    environment: {
      ...process.env,
      COMMAND_LOG: commandLog,
      PATH: `${binDirectory}:${process.env.PATH}`,
    },
  }
}

function writeEnvironmentFile(directory: string, mode: "dev" | "production") {
  writeFileSync(
    path.join(directory, `.env.${mode}`),
    requiredEnvironment.map((key) => `${key}=configured`).join("\n"),
  )
}

describe("deploy-worker", () => {
  it("builds and deploys development only from the dev branch", () => {
    const fixture = createDeploymentFixture("dev")
    writeEnvironmentFile(fixture.directory, "dev")

    const result = spawnSync(process.execPath, [deployScript, "dev"], {
      cwd: fixture.directory,
      encoding: "utf8",
      env: fixture.environment,
    })

    expect(result.status).toBe(0)
    expect(readFileSync(fixture.commandLog, "utf8")).toBe(
      "bun [dev] run build:dev\nbunx [dev] wrangler deploy --env dev\n",
    )
  })

  it("builds and deploys production only from the main branch", () => {
    const fixture = createDeploymentFixture("main")
    writeEnvironmentFile(fixture.directory, "production")

    const result = spawnSync(process.execPath, [deployScript, "production"], {
      cwd: fixture.directory,
      encoding: "utf8",
      env: fixture.environment,
    })

    expect(result.status).toBe(0)
    expect(readFileSync(fixture.commandLog, "utf8")).toBe(
      "bun [production] run build:prod\nbunx [production] wrangler deploy --env production\n",
    )
  })

  it("stops before running commands when the branch does not match", () => {
    const fixture = createDeploymentFixture("dev")
    writeEnvironmentFile(fixture.directory, "production")

    const result = spawnSync(process.execPath, [deployScript, "production"], {
      cwd: fixture.directory,
      encoding: "utf8",
      env: fixture.environment,
    })

    expect(result.status).toBe(1)
    expect(result.stderr).toContain("Production deployments must run from the main branch")
    expect(spawnSync("test", ["-e", fixture.commandLog]).status).toBe(1)
  })

  it("stops before running commands when a required value is blank", () => {
    const fixture = createDeploymentFixture("dev")
    writeFileSync(path.join(fixture.directory, ".env.dev"), "CONVEX_DEPLOYMENT=\n")

    const result = spawnSync(process.execPath, [deployScript, "dev"], {
      cwd: fixture.directory,
      encoding: "utf8",
      env: fixture.environment,
    })

    expect(result.status).toBe(1)
    expect(result.stderr).toContain("Missing required values in .env.dev")
    expect(spawnSync("test", ["-e", fixture.commandLog]).status).toBe(1)
  })
})
