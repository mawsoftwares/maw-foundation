<?php

declare(strict_types=1);

namespace App\Infrastructure\Auth;

/**
 * Plain RFC 7914 scrypt in PHP, used ONLY to verify hashes whose salt libsodium cannot take (it insists on 32
 * bytes; the Node backend historically wrote 16). Roughly 1s per call, so the hasher rehashes into the fast
 * libsodium format after the first successful login.
 */
final class ScryptFallback
{
    public static function derive(string $password, string $salt, int $n, int $r, int $p, int $length): string
    {
        $blocks = hash_pbkdf2('sha256', $password, $salt, 1, $p * 128 * $r, true);
        $mixed = '';
        for ($i = 0; $i < $p; $i++) {
            $mixed .= self::roMix(substr($blocks, $i * 128 * $r, 128 * $r), $n, $r);
        }

        return hash_pbkdf2('sha256', $password, $mixed, 1, $length, true);
    }

    private static function roMix(string $block, int $n, int $r): string
    {
        /** @var list<int> $x */
        $x = array_values(unpack('V*', $block) ?: []);
        $v = []; // packed 128*r-byte strings: ~16 MB for N=16384, r=8
        for ($i = 0; $i < $n; $i++) {
            $v[$i] = pack('V*', ...$x);
            $x = self::blockMix($x, $r);
        }
        for ($i = 0; $i < $n; $i++) {
            $j = $x[(2 * $r - 1) * 16] & ($n - 1);
            /** @var list<int> $vj */
            $vj = array_values(unpack('V*', $v[$j]) ?: []);
            foreach ($x as $k => $word) {
                $x[$k] = $word ^ $vj[$k];
            }
            $x = self::blockMix($x, $r);
        }

        return pack('V*', ...$x);
    }

    /**
     * @param list<int> $b
     * @return list<int>
     */
    private static function blockMix(array $b, int $r): array
    {
        $x = array_slice($b, (2 * $r - 1) * 16, 16);
        $even = [];
        $odd = [];
        for ($i = 0; $i < 2 * $r; $i++) {
            for ($k = 0; $k < 16; $k++) {
                $x[$k] ^= $b[$i * 16 + $k];
            }
            self::salsa208($x);
            if ($i % 2 === 0) {
                array_push($even, ...$x);
            } else {
                array_push($odd, ...$x);
            }
        }

        return [...$even, ...$odd];
    }

    /** @param list<int> $b */
    private static function salsa208(array &$b): void
    {
        [$x0, $x1, $x2, $x3, $x4, $x5, $x6, $x7, $x8, $x9, $x10, $x11, $x12, $x13, $x14, $x15] = $b;
        [$j0, $j1, $j2, $j3, $j4, $j5, $j6, $j7, $j8, $j9, $j10, $j11, $j12, $j13, $j14, $j15] = $b;
        for ($i = 0; $i < 4; $i++) {
            $t = ($x0 + $x12) & 0xffffffff; $x4 ^= (($t << 7) | ($t >> 25)) & 0xffffffff;
            $t = ($x4 + $x0) & 0xffffffff; $x8 ^= (($t << 9) | ($t >> 23)) & 0xffffffff;
            $t = ($x8 + $x4) & 0xffffffff; $x12 ^= (($t << 13) | ($t >> 19)) & 0xffffffff;
            $t = ($x12 + $x8) & 0xffffffff; $x0 ^= (($t << 18) | ($t >> 14)) & 0xffffffff;
            $t = ($x5 + $x1) & 0xffffffff; $x9 ^= (($t << 7) | ($t >> 25)) & 0xffffffff;
            $t = ($x9 + $x5) & 0xffffffff; $x13 ^= (($t << 9) | ($t >> 23)) & 0xffffffff;
            $t = ($x13 + $x9) & 0xffffffff; $x1 ^= (($t << 13) | ($t >> 19)) & 0xffffffff;
            $t = ($x1 + $x13) & 0xffffffff; $x5 ^= (($t << 18) | ($t >> 14)) & 0xffffffff;
            $t = ($x10 + $x6) & 0xffffffff; $x14 ^= (($t << 7) | ($t >> 25)) & 0xffffffff;
            $t = ($x14 + $x10) & 0xffffffff; $x2 ^= (($t << 9) | ($t >> 23)) & 0xffffffff;
            $t = ($x2 + $x14) & 0xffffffff; $x6 ^= (($t << 13) | ($t >> 19)) & 0xffffffff;
            $t = ($x6 + $x2) & 0xffffffff; $x10 ^= (($t << 18) | ($t >> 14)) & 0xffffffff;
            $t = ($x15 + $x11) & 0xffffffff; $x3 ^= (($t << 7) | ($t >> 25)) & 0xffffffff;
            $t = ($x3 + $x15) & 0xffffffff; $x7 ^= (($t << 9) | ($t >> 23)) & 0xffffffff;
            $t = ($x7 + $x3) & 0xffffffff; $x11 ^= (($t << 13) | ($t >> 19)) & 0xffffffff;
            $t = ($x11 + $x7) & 0xffffffff; $x15 ^= (($t << 18) | ($t >> 14)) & 0xffffffff;
            $t = ($x0 + $x3) & 0xffffffff; $x1 ^= (($t << 7) | ($t >> 25)) & 0xffffffff;
            $t = ($x1 + $x0) & 0xffffffff; $x2 ^= (($t << 9) | ($t >> 23)) & 0xffffffff;
            $t = ($x2 + $x1) & 0xffffffff; $x3 ^= (($t << 13) | ($t >> 19)) & 0xffffffff;
            $t = ($x3 + $x2) & 0xffffffff; $x0 ^= (($t << 18) | ($t >> 14)) & 0xffffffff;
            $t = ($x5 + $x4) & 0xffffffff; $x6 ^= (($t << 7) | ($t >> 25)) & 0xffffffff;
            $t = ($x6 + $x5) & 0xffffffff; $x7 ^= (($t << 9) | ($t >> 23)) & 0xffffffff;
            $t = ($x7 + $x6) & 0xffffffff; $x4 ^= (($t << 13) | ($t >> 19)) & 0xffffffff;
            $t = ($x4 + $x7) & 0xffffffff; $x5 ^= (($t << 18) | ($t >> 14)) & 0xffffffff;
            $t = ($x10 + $x9) & 0xffffffff; $x11 ^= (($t << 7) | ($t >> 25)) & 0xffffffff;
            $t = ($x11 + $x10) & 0xffffffff; $x8 ^= (($t << 9) | ($t >> 23)) & 0xffffffff;
            $t = ($x8 + $x11) & 0xffffffff; $x9 ^= (($t << 13) | ($t >> 19)) & 0xffffffff;
            $t = ($x9 + $x8) & 0xffffffff; $x10 ^= (($t << 18) | ($t >> 14)) & 0xffffffff;
            $t = ($x15 + $x14) & 0xffffffff; $x12 ^= (($t << 7) | ($t >> 25)) & 0xffffffff;
            $t = ($x12 + $x15) & 0xffffffff; $x13 ^= (($t << 9) | ($t >> 23)) & 0xffffffff;
            $t = ($x13 + $x12) & 0xffffffff; $x14 ^= (($t << 13) | ($t >> 19)) & 0xffffffff;
            $t = ($x14 + $x13) & 0xffffffff; $x15 ^= (($t << 18) | ($t >> 14)) & 0xffffffff;
        }
        $b = [
            ($x0 + $j0) & 0xffffffff, ($x1 + $j1) & 0xffffffff, ($x2 + $j2) & 0xffffffff, ($x3 + $j3) & 0xffffffff,
            ($x4 + $j4) & 0xffffffff, ($x5 + $j5) & 0xffffffff, ($x6 + $j6) & 0xffffffff, ($x7 + $j7) & 0xffffffff,
            ($x8 + $j8) & 0xffffffff, ($x9 + $j9) & 0xffffffff, ($x10 + $j10) & 0xffffffff, ($x11 + $j11) & 0xffffffff,
            ($x12 + $j12) & 0xffffffff, ($x13 + $j13) & 0xffffffff, ($x14 + $j14) & 0xffffffff, ($x15 + $j15) & 0xffffffff,
        ];
    }
}
