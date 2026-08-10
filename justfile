set shell := ["bash", "-eu", "-o", "pipefail", "-c"]

setup:
    pnpm install
    pnpm exec playwright install --with-deps chromium

run:
    pnpm dev

test:
    pnpm test

test-e2e:
    pnpm test:e2e

lint:
    pnpm lint

format-check:
    pnpm format:check

type-check:
    pnpm typecheck

build:
    pnpm build

proof-start:
    pnpm --filter @ascend/api exec tsx src/cli/proof-start.ts

proof-stop:
    pnpm --filter @ascend/api exec tsx src/cli/proof-stop.ts

proof-terminal-parity:
    pnpm exec playwright test tests/e2e/workbench-proof.spec.ts --project=chromium

verify-focused *args:
    pnpm exec vitest run {{args}}

verify:
    pnpm format:check
    pnpm lint
    pnpm typecheck
    pnpm test
    pnpm build
    pnpm test:e2e
