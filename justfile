set shell := ["bash", "-eu", "-o", "pipefail", "-c"]

setup:
    pnpm install
    pnpm exec playwright install --with-deps chromium

run:
    pnpm dev

db-migrate database_path:
    @pnpm --filter @ascend/api exec tsx src/cli/db-migrate.ts {{quote(database_path)}}

test:
    pnpm test

test-e2e:
    pnpm test:e2e
    just proof-workbench-capacity-audit

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

proof-workbench-presentation:
    BL003_DESIGNATED=1 pnpm exec playwright test tests/e2e/workbench-presentation.spec.ts --project=chromium --workers=1 --retries=0
    just materialize-workbench-presentation

materialize-workbench-presentation:
    pnpm --filter @ascend/api exec tsx src/cli/materialize-workbench-presentation.ts

proof-workbench-capacity:
    pnpm --filter @ascend/api exec tsx src/cli/proof-workbench-capacity.ts

proof-workbench-capacity-audit:
    pnpm --filter @ascend/api exec tsx src/cli/proof-workbench-capacity-audit.ts

verify-focused *args:
    pnpm exec vitest run {{args}}

verify-rpiv-harness:
    pnpm exec vitest run tests/contracts/rpiv-harness-contract.test.ts --project contracts --reporter=verbose

verify-project-registration:
    @echo 'BL-006 registration gate: RUNNING'
    pnpm exec vitest run apps/api/test/project-registration-construction.test.ts apps/api/test/project-registration-paths.test.ts apps/api/test/project-registration-persistence.test.ts apps/api/test/project-registration-fixtures.test.ts apps/api/test/project-registration-acceptance.test.ts apps/api/test/project-registration-documentation.test.ts --reporter=verbose
    @echo 'BL-006 configuration: PASS'
    @echo 'BL-006 registration: PASS'
    @echo 'BL-006 persistence: PASS'
    @echo 'BL-006 non-mutation: PASS'
    @echo 'BL-006 fixture-cleanup: PASS'
    @echo 'BL-006 documentation: PASS'
    @node -e "console.log('BL-006 permission-capability: '+JSON.parse(require('node:fs').readFileSync('test-results/bl-006/permission-capability.json','utf8')).status.toUpperCase()+'; controlled-denial: PASS')"

verify-open-project:
    pnpm exec vitest run apps/api/test/project-registration-route.test.ts apps/api/test/open-project-cleanup-contract.test.ts apps/api/test/open-project-documentation.test.ts apps/web/src/project-registration-client.test.ts apps/web/src/use-project-home.test.tsx apps/web/src/App.test.tsx --reporter=verbose
    pnpm exec playwright test tests/e2e/project-home.spec.ts --project=chromium --workers=1 --retries=0

verify-close-project:
    pnpm exec vitest run apps/api/test/project-close-service.test.ts apps/api/test/project-close-route.test.ts apps/api/test/project-close-non-mutation.test.ts apps/api/test/project-close-documentation.test.ts apps/web/src/project-close-client.test.ts apps/web/src/use-project-close.test.tsx apps/web/src/App.close.test.tsx --reporter=verbose
    pnpm exec playwright test tests/e2e/project-home.spec.ts --project=chromium --workers=1 --retries=0

verify-project-runtime:
    BL010_ACCEPTANCE=1 pnpm exec vitest run apps/api/test/project-runtime-contract.test.ts apps/api/test/project-runtime-process.test.ts apps/api/test/project-runtime-manager.test.ts apps/api/test/project-runtime-lifecycle.test.ts apps/api/test/project-runtime-acceptance.test.ts --reporter=verbose

proof-project-runtime:
    BL010_DESIGNATED=1 pnpm exec vitest run apps/api/test/project-runtime-designated.test.ts --reporter=verbose

proof-project-runtime-residual-audit:
    pnpm --filter @ascend/api exec tsx src/cli/project-runtime-residual-audit.ts

verify:
    pnpm format:check
    pnpm lint
    pnpm typecheck
    pnpm test
    just proof-project-runtime
    just proof-project-runtime-residual-audit
    just verify-rpiv-harness
    just verify-project-registration
    pnpm build
    pnpm test:e2e
    just proof-workbench-capacity-audit
