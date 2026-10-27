#!/usr/bin/env node
/* Encrypts a page's build into one payload that only the password opens.
 *
 *   node tools/encrypt-page.mjs <out.bin> --js <file> [--css <file>]
 *        [--file <url>=<path> ...] [--dir <url-prefix>=<folder> ...]
 *
 * The site repo is public, so a password-protected page ships nothing but
 * ciphertext: the plaintext build stays outside the repo, and this writes the
 * encrypted payload that work/_shared/locked.js fetches and opens in the
 * browser. --file entries are resources the page asks for by URL at runtime
 * (an iframe, an image, a font): the page gets them as blob URLs, and every
 * occurrence of <url> in the JS and CSS is rewritten to point at them.
 * --dir adds every file in a folder, each at <url-prefix><file name>.
 *
 * The password is asked for on the terminal, hidden, twice; it is never read
 * from an argument, the environment or a file, and never written anywhere.
 *
 * Format: "MFY1" | salt (16) | iv (12) | AES-256-GCM( gzip( container ) )
 *   key: PBKDF2-SHA-256, 600,000 iterations, from the password and salt
 *   container: u32 header length | header JSON | the entries' bytes, in order
 *   header: { v: 1, entries: [{ name, type, url?, size }] }  name: js | css | file
 */
import { readFile, readdir, writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { openSync, readSync, closeSync } from "node:fs";
import { execSync } from "node:child_process";

const ITER = 600000;
const TYPES = { ".js": "text/javascript", ".css": "text/css", ".html": "text/html", ".mp3": "audio/mpeg",
                ".mp4": "video/mp4", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif",
                ".webp": "image/webp", ".svg": "image/svg+xml", ".json": "application/json",
                ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf", ".otf": "font/otf" };
const typeOf = (p) => TYPES[p.slice(p.lastIndexOf(".")).toLowerCase()] || "application/octet-stream";

function args(argv) {
  const a = { out: null, js: null, css: null, files: [], dirs: [] };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === "--js") a.js = argv[++i];
    else if (k === "--css") a.css = argv[++i];
    else if (k === "--file") {
      const v = argv[++i], eq = v.indexOf("=");
      if (eq < 1) throw new Error("--file wants <url>=<path>, got " + v);
      a.files.push({ url: v.slice(0, eq), path: v.slice(eq + 1) });
    } else if (k === "--dir") {
      const v = argv[++i], eq = v.indexOf("=");
      if (eq < 1) throw new Error("--dir wants <url-prefix>=<folder>, got " + v);
      a.dirs.push({ prefix: v.slice(0, eq), path: v.slice(eq + 1) });
    } else if (!a.out) a.out = k;
    else throw new Error("unexpected argument " + k);
  }
  if (!a.out || !a.js) throw new Error("usage: encrypt-page.mjs <out.bin> --js <file> [--css <file>] [--file <url>=<path> ...]");
  return a;
}

/* hidden input from the terminal itself, so nothing lands in shell history */
function ask(prompt) {
  const fd = openSync("/dev/tty", "r+");
  try {
    execSync("stty -echo", { stdio: [fd, "ignore", "ignore"] });   /* before the prompt, so nothing typed early shows */
    process.stderr.write(prompt);
    let s = "", b = Buffer.alloc(1);
    while (readSync(fd, b, 0, 1) === 1 && b[0] !== 10 && b[0] !== 13) s += String.fromCharCode(b[0]);
    return Buffer.from(s, "latin1").toString("utf8");
  } finally {
    try { execSync("stty echo", { stdio: [fd, "ignore", "ignore"] }); } catch {}
    process.stderr.write("\n");
    closeSync(fd);
  }
}

const a = args(process.argv.slice(2));
for (const d of a.dirs)
  for (const n of (await readdir(d.path)).sort()) if (!n.startsWith(".")) a.files.push({ url: d.prefix + n, path: d.path.replace(/\/?$/, "/") + n });
const js = await readFile(a.js);
const css = a.css ? await readFile(a.css) : null;
const text = js.toString("utf8") + (css ? css.toString("utf8") : "");
const parts = [{ name: "js", type: "text/javascript", bytes: js }];
if (css) parts.push({ name: "css", type: "text/css", bytes: css });
for (const f of a.files) {
  if (!text.includes(f.url)) console.warn(`note: ${f.url} does not occur in the JS or CSS`);
  parts.push({ name: "file", type: typeOf(f.path), url: f.url, bytes: await readFile(f.path) });
}

const header = Buffer.from(JSON.stringify({ v: 1, entries: parts.map((p) => ({ name: p.name, type: p.type, url: p.url, size: p.bytes.length })) }));
const len = Buffer.alloc(4); len.writeUInt32BE(header.length);
const plain = gzipSync(Buffer.concat([len, header, ...parts.map((p) => p.bytes)]), { level: 9 });

const pw = ask("Password: ");
if (pw.length < 8) { console.error("Use at least 8 characters."); process.exit(1); }
if (ask("Again: ") !== pw) { console.error("The two passwords differ."); process.exit(1); }

const { subtle } = globalThis.crypto;
const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
const base = await subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveKey"]);
const key = await subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt, iterations: ITER }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
const ct = new Uint8Array(await subtle.encrypt({ name: "AES-GCM", iv }, key, plain));

await writeFile(a.out, Buffer.concat([Buffer.from("MFY1"), salt, iv, ct]));
const mb = (n) => (n / 1048576).toFixed(1) + " MB";
console.log(`${a.out}: ${mb(ct.length + 32)} (${parts.length} entries, ${mb(parts.reduce((s, p) => s + p.bytes.length, 0))} before gzip)`);
