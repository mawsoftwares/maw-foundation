.PHONY: help up down build test verify lint typecheck shell logs fresh

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

up: ## Start dev environment (app + nginx + postgres)
	docker compose up -d

down: ## Stop all containers
	docker compose down

build: ## Rebuild Docker images
	docker compose build --no-cache

test: ## Run full test suite in Docker
	docker compose --profile test run --rm test

verify: ## Run typecheck + lint + tests locally
	composer verify

typecheck: ## Run PHPStan level 8
	composer typecheck

lint: ## Check code style with Pint
	composer lint

lint-fix: ## Fix code style with Pint
	composer lint:fix

shell: ## Open shell in app container
	docker compose exec app sh

logs: ## Tail app container logs
	docker compose logs -f app

fresh: ## Reset database and restart
	docker compose down -v
	docker compose up -d
	docker compose exec app php artisan migrate:fresh

prod-build: ## Build production image
	docker build --target app -t maw-foundation-php:latest .

prod-up: ## Start production stack
	docker compose -f docker-compose.prod.yml up -d
