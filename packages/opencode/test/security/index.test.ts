import { expect, test } from "bun:test"
import path from "path"
import { evaluateSandboxFilesystemRisks } from "@/security"
import { tmpdir } from "../fixture/fixture"

test("file tools use sandbox read and write boundaries", async () => {
  await using tmp = await tmpdir()
  const project = path.join(tmp.path, "project")
  const secret = path.join(tmp.path, "secret")
  const visible = path.join(secret, "visible")
  const policy = {
    enabled: true,
    denyRead: [secret],
    allowRead: [visible],
    allowWrite: [project],
    denyWrite: [path.join(project, ".env")],
  }

  expect(
    await evaluateSandboxFilesystemRisks(
      policy,
      [{ path: path.join(secret, "hidden"), access: "read" }],
      project,
      project,
    ),
  ).toEqual([`filesystem:${secret}`])
  expect(
    await evaluateSandboxFilesystemRisks(
      policy,
      [{ path: path.join(visible, "file"), access: "read" }],
      project,
      project,
    ),
  ).toEqual([])
  expect(
    await evaluateSandboxFilesystemRisks(policy, [{ path: tmp.path, access: "read", tree: true }], project, project),
  ).toEqual([`filesystem:${secret}`])
  expect(
    await evaluateSandboxFilesystemRisks(
      policy,
      [{ path: path.join(project, "file"), access: "write" }],
      project,
      project,
    ),
  ).toEqual([])
  expect(
    await evaluateSandboxFilesystemRisks(
      policy,
      [{ path: path.join(project, ".env"), access: "write" }],
      project,
      project,
    ),
  ).toEqual([`filesystem:${path.join(project, ".env")}`])
  expect(
    await evaluateSandboxFilesystemRisks(
      policy,
      [{ path: path.join(tmp.path, "outside"), access: "write" }],
      project,
      project,
    ),
  ).toEqual([`filesystem:${path.join(tmp.path, "outside")}`])
})
