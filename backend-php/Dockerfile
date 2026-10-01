FROM php:8.3-fpm-alpine AS base

RUN apk add --no-cache \
    libpq-dev \
    libsodium-dev \
    icu-dev \
    fcgi \
    && docker-php-ext-install \
    pdo_pgsql \
    pgsql \
    sodium \
    intl \
    opcache

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app

# --- Dependencies ---
FROM base AS vendor

COPY composer.json composer.lock* ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist

# --- Development (with dev deps) ---
FROM base AS dev

COPY --from=vendor /app/vendor vendor/
COPY . .

RUN composer install --no-scripts --prefer-dist \
    && composer dump-autoload

RUN chown -R www-data:www-data storage bootstrap/cache

USER www-data

EXPOSE 9000
CMD ["php-fpm"]

# --- Production ---
FROM base AS app

COPY docker/opcache.ini /usr/local/etc/php/conf.d/opcache.ini
COPY docker/php-fpm.conf /usr/local/etc/php-fpm.d/zz-production.conf

COPY --from=vendor /app/vendor vendor/
COPY . .

RUN composer dump-autoload --optimize --no-dev \
    && php artisan config:cache \
    && php artisan route:cache

RUN chown -R www-data:www-data storage bootstrap/cache

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD SCRIPT_NAME=/health SCRIPT_FILENAME=/health REQUEST_METHOD=GET \
        cgi-fcgi -bind -connect 127.0.0.1:9000 | grep -q '"status":"ok"' || exit 1

USER www-data

EXPOSE 9000
CMD ["php-fpm"]
