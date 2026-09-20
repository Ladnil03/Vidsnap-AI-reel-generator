# ==============================================================================
# VidSnap.AI — Development Makefile
# Usage: make dev | make test | make lint | make clean
# ==============================================================================

PYTHON := env/Scripts/python.exe
PIP := env/Scripts/pip.exe
PYTEST := $(PYTHON) -m pytest
RUFF := env/Scripts/ruff.exe

# ──────────────────────────────────────────
# Local Development
# ──────────────────────────────────────────

.PHONY: dev
dev: ## Boot full development stack (API + Worker + Mongo + Redis)
	docker compose up --build -d
	@echo "✅ Dev stack is up. API: http://localhost:8000/docs"

.PHONY: dev-down
dev-down: ## Tear down dev stack
	docker compose down

.PHONY: dev-logs
dev-logs: ## Tail logs from all services
	docker compose logs -f

.PHONY: dev-api
dev-api: ## Run API locally without Docker (requires Mongo + Redis running)
	$(PYTHON) -m uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000

.PHONY: dev-worker
dev-worker: ## Run ARQ media worker locally
	$(PYTHON) -m arq backend.workers.media_worker.WorkerSettings

.PHONY: dev-frontend
dev-frontend: ## Run Next.js frontend development server
	cd frontend && npm run dev

.PHONY: build-frontend
build-frontend: ## Build Next.js frontend for production
	cd frontend && npm run build

# ──────────────────────────────────────────
# Virtual Environment
# ──────────────────────────────────────────

.PHONY: venv
venv: ## Create virtual environment
	python -m venv env

.PHONY: install
install: ## Install all dependencies (production + dev)
	$(PIP) install -r requirements.txt -r requirements-dev.txt

# ──────────────────────────────────────────
# Testing & Quality
# ──────────────────────────────────────────

.PHONY: test
test: ## Run full test suite with coverage
	$(PYTEST) tests/ -v --cov=backend/app --cov-report=term-missing

.PHONY: test-unit
test-unit: ## Run unit tests only
	$(PYTEST) tests/unit/ -v

.PHONY: test-integration
test-integration: ## Run integration tests only
	$(PYTEST) tests/integration/ -v

.PHONY: lint
lint: ## Run ruff linter on backend and tests
	$(RUFF) check backend/ tests/

.PHONY: lint-fix
lint-fix: ## Auto-fix lint violations
	$(RUFF) check --fix backend/ tests/

.PHONY: format
format: ## Format code with ruff
	$(RUFF) format backend/ tests/

.PHONY: format-check
format-check: ## Check formatting without modifying files
	$(RUFF) format --check backend/ tests/

# ──────────────────────────────────────────
# Maintenance
# ──────────────────────────────────────────

.PHONY: clean
clean: ## Remove caches and generated files
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .pytest_cache -exec rm -rf {} + 2>/dev/null || true
	rm -f .coverage

.PHONY: help
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
