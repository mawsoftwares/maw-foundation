<?php

declare(strict_types=1);

namespace Tests\Unit\Auth;

use App\Infrastructure\Auth\ScryptPasswordHasher;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

/**
 * The reference hashes below were produced by Node (`crypto.scryptSync`, the algorithm behind
 * `@mawsoftwares/auth-core` hashPassword) — they pin PHP/Node interoperability on the shared `users.password_hash`.
 */
final class ScryptPasswordHasherTest extends TestCase
{
    /** Node's own format: 16-byte salt (needs the pure-PHP fallback to verify). */
    private const NODE_16_BYTE_SALT = 'scrypt$000102030405060708090a0b0c0d0e0f$25b376840366f4d3b0e21e414476676e3cd0e89af4430356a234ce0b65a021b56233e7b0b24f07bc9340195f19c90a1da7562514ed0762a6dae3c27ff5b07d62';

    /** 32-byte salt (verifies via libsodium). */
    private const NODE_32_BYTE_SALT = 'scrypt$0707070707070707070707070707070707070707070707070707070707070707$d25629c89c5f132dcd08e6846e1e37291e184a69e237997c118a2f938236690e2e83e585fa180a404e254de11aaeac6cd532fbd2fc8f98b1b0b5b526eef368f5';

    #[Test]
    public function verifies_hashes_written_by_node(): void
    {
        $h = new ScryptPasswordHasher();
        $this->assertTrue($h->verify('correct horse', self::NODE_16_BYTE_SALT));
        $this->assertTrue($h->verify('correct horse', self::NODE_32_BYTE_SALT));
        $this->assertFalse($h->verify('wrong horse', self::NODE_16_BYTE_SALT));
        $this->assertFalse($h->verify('wrong horse', self::NODE_32_BYTE_SALT));
    }

    #[Test]
    public function writes_the_node_format_and_round_trips(): void
    {
        $h = new ScryptPasswordHasher();
        $hash = $h->hash('s3cret-pass');

        $this->assertMatchesRegularExpression('/^scrypt\$[0-9a-f]{64}\$[0-9a-f]{128}$/', $hash);
        $this->assertTrue($h->verify('s3cret-pass', $hash));
        $this->assertFalse($h->verify('other', $hash));
        $this->assertNotSame($hash, $h->hash('s3cret-pass'), 'salted');
    }

    #[Test]
    public function a_hash_written_here_is_what_node_would_compute(): void
    {
        $hash = (new ScryptPasswordHasher())->hash('s3cret-pass');
        [, $saltHex, $keyHex] = explode('$', $hash);
        $script = 'const c=require("crypto");process.stdout.write(c.scryptSync("s3cret-pass",Buffer.from("' . $saltHex . '","hex"),64).toString("hex"))';
        $node = trim((string) shell_exec('node -e ' . escapeshellarg($script) . ' 2>/dev/null'));
        if ($node === '') {
            $this->markTestSkipped('node is not available');
        }
        $this->assertSame($node, $keyHex);
    }

    #[Test]
    public function flags_only_slow_hashes_for_rehash(): void
    {
        $h = new ScryptPasswordHasher();
        $this->assertTrue($h->needsRehash(self::NODE_16_BYTE_SALT));
        $this->assertFalse($h->needsRehash(self::NODE_32_BYTE_SALT));
        $this->assertFalse($h->needsRehash($h->hash('x')));
    }

    #[Test]
    public function rejects_malformed_hashes(): void
    {
        $h = new ScryptPasswordHasher();
        foreach (['', 'plain', 'scrypt$zz$yy', 'bcrypt$00$00', 'scrypt$00', 'abc$def'] as $bad) {
            $this->assertFalse($h->verify('x', $bad), $bad);
        }
    }

    #[Test]
    public function refuses_parameters_that_would_break_node_compatibility(): void
    {
        $this->expectException(\LogicException::class);
        new ScryptPasswordHasher(n: 32768);
    }
}
