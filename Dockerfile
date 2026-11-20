FROM node:22-bookworm-slim AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM composer:2 AS composer

FROM php:8.3-apache-bookworm
RUN apt-get update \
    && apt-get install -y --no-install-recommends libonig-dev libpq-dev libzip-dev unzip \
    && docker-php-ext-install mbstring pdo_pgsql zip \
    && a2enmod rewrite \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer /usr/bin/composer /usr/local/bin/composer
WORKDIR /var/www/html
COPY backend/ ./
RUN mkdir -p storage/app/private storage/app/public storage/framework/cache/data \
        storage/framework/sessions storage/framework/views storage/logs bootstrap/cache \
    && composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader \
    && chown -R www-data:www-data storage bootstrap/cache
COPY --from=frontend /app/frontend/dist/ public/
COPY deploy/apache.conf /etc/apache2/sites-available/000-default.conf
COPY deploy/start.sh /usr/local/bin/start-northstar
RUN chmod +x /usr/local/bin/start-northstar

CMD ["start-northstar"]
