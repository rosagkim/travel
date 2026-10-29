import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const branch = "github-pages";
const workflow = ".github/workflows/publish-built.yml";
const scratch = mkdtempSync(join(tmpdir(), "service-pages-"));
const target = join(scratch, "site");
let temporaryBranch;
let attached = false;

function git(args, cwd = root, allowFailure = false) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (result.error) throw result.error;
  if (result.status !== 0 && !allowFailure) {
    // Do not echo command arguments or remote URLs that may contain credentials.
    throw new Error(
      result.stderr.trim() || `Git 작업 실패 (exit ${result.status})`,
    );
  }
  return result;
}

try {
  if (!existsSync(join(dist, "index.html")))
    throw new Error("먼저 npm run build를 실행하세요.");
  const remote = git(
    ["ls-remote", "--exit-code", "origin", `refs/heads/${branch}`],
    root,
    true,
  );
  if (remote.status === 0) {
    git(["fetch", "origin", branch]);
    git(["worktree", "add", "--detach", target, "FETCH_HEAD"]);
    attached = true;
  } else if (remote.status === 2) {
    if (process.env.GITHUB_ACTIONS) {
      throw new Error(
        "github-pages 초기 설정이 필요합니다. 로컬에서 npm run deploy를 한 번 실행하세요.",
      );
    }
    git(["worktree", "add", "--detach", target, "HEAD"]);
    attached = true;
    temporaryBranch = `pages-bootstrap-${Date.now()}`;
    git(["switch", "--orphan", temporaryBranch], target);
  } else {
    throw new Error(
      remote.stderr.trim() || "원격 브랜치를 확인할 수 없습니다.",
    );
  }

  // Keep the branch's deployment workflow unchanged: GITHUB_TOKEN cannot edit
  // workflow files and does not trigger another workflow when it pushes.
  for (const name of readdirSync(target)) {
    if (name !== ".git" && name !== ".github")
      rmSync(join(target, name), { recursive: true, force: true });
  }
  cpSync(dist, target, { recursive: true });
  if (!existsSync(join(target, workflow))) {
    mkdirSync(dirname(join(target, workflow)), { recursive: true });
    cpSync(join(root, workflow), join(target, workflow));
  }
  git(["add", "--all"], target);
  const diff = git(["diff", "--cached", "--quiet"], target, true);
  if (diff.status === 1) {
    const source = git(["rev-parse", "--short", "HEAD"]).stdout.trim();
    git(
      [
        "-c",
        "user.name=github-actions[bot]",
        "-c",
        "user.email=41898282+github-actions[bot]@users.noreply.github.com",
        "commit",
        "-m",
        `Deploy site from ${source}`,
      ],
      target,
    );
  } else if (diff.status !== 0) {
    throw new Error(
      diff.stderr.trim() || "빌드 변경 사항을 확인할 수 없습니다.",
    );
  }
  git(["push", "origin", `HEAD:refs/heads/${branch}`], target);
  console.log(`빌드 결과를 ${branch} 브랜치에 푸시했습니다.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  if (attached) git(["worktree", "remove", "--force", target], root, true);
  if (temporaryBranch) git(["branch", "-D", temporaryBranch], root, true);
  rmSync(scratch, { recursive: true, force: true });
}
