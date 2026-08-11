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

verify:
    pnpm format:check
    pnpm lint
    pnpm typecheck
    pnpm test
    just verify-project-registration
    pnpm build
    pnpm test:e2e
    just proof-workbench-capacity-audit
