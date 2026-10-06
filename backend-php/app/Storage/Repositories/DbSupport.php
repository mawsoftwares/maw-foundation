<?php

declare(strict_types=1);

namespace App\Storage\Repositories;

/** Small helpers shared by the Postgres repositories. */
trait DbSupport
{
    private static function iso(mixed $value): string
    {
        $date = $value instanceof \DateTimeInterface ? \DateTimeImmutable::createFromInterface($value) : new \DateTimeImmutable((string) $value);

        return $date->setTimezone(new \DateTimeZone('UTC'))->format('Y-m-d\TH:i:s.v\Z');
    }

    private static function isoOrNull(mixed $value): ?string
    {
        return $value === null ? null : self::iso($value);
    }

    /** Escapes `%`, `_` and `\` so user search text is matched literally by ILIKE. */
    private static function likeContains(string $term): string
    {
        return '%' . preg_replace('/[\\\\%_]/', '\\\\$0', $term) . '%';
    }

    /**
     * Maps an API sort key to a SQL column through an allow-list — never interpolates user input.
     *
     * @param array<string, string> $columns
     */
    private static function orderBy(?string $sortBy, ?string $direction, array $columns, string $fallback): string
    {
        $column = ($sortBy !== null ? ($columns[$sortBy] ?? null) : null) ?? $fallback;

        return $column . ' ' . ($direction === 'desc' ? 'DESC' : 'ASC');
    }

    private static function isUniqueViolation(\Throwable $e): bool
    {
        return $e instanceof \Illuminate\Database\UniqueConstraintViolationException
            || ($e instanceof \Illuminate\Database\QueryException && ($e->errorInfo[0] ?? null) === '23505');
    }
}
