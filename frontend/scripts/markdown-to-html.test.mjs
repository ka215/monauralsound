import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { convertMarkdown, decodeUtf8, parseInputArgs, resolveInputPath } from './markdown-to-html.mjs'

const execFileAsync = promisify(execFile)

test('accepts file paths with or without the pnpm argument separator', () => {
  assert.deepEqual(parseInputArgs(['article.md']), { input: 'article.md', output: undefined, help: false })
  assert.deepEqual(parseInputArgs(['--', 'article.md']), { input: 'article.md', output: undefined, help: false })
  assert.deepEqual(
    parseInputArgs(['--', 'C:\\articles\\my post.md', '--output', 'C:\\articles\\post.html']),
    { input: 'C:\\articles\\my post.md', output: 'C:\\articles\\post.html', help: false },
  )
})

test('decodes UTF-8 text and removes an optional BOM', () => {
  assert.equal(decodeUtf8(Buffer.from('日本語', 'utf8'), 'input.md'), '日本語')
  assert.equal(decodeUtf8(Buffer.from('\uFEFF日本語', 'utf8'), 'input.md'), '日本語')
  assert.throws(() => decodeUtf8(Buffer.from([0x82, 0xa0]), 'input.md'), /input\.md: input must be UTF-8 encoded/)
})

test('writes converted HTML as UTF-8 without a BOM', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'markdown-to-html-'))
  const input = join(directory, 'article.md')
  const output = join(directory, 'article.html')
  try {
    await writeFile(input, '# 日本語の記事\n', { encoding: 'utf8' })
    await execFileAsync(process.execPath, [
      fileURLToPath(new URL('./markdown-to-html.mjs', import.meta.url)),
      input,
      '--output',
      output,
    ])
    const bytes = await readFile(output)
    assert.equal(bytes.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])), false)
    assert.equal(bytes.toString('utf8'), '<h1>日本語の記事</h1>\n')
  }
  finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('resolves Git Bash drive paths on Windows', () => {
  if (process.platform === 'win32') {
    assert.equal(
      resolveInputPath('/c/xampp/htdocs/ka2.org/.idea/article.md'),
      'C:\\xampp\\htdocs\\ka2.org\\.idea\\article.md',
    )
  }
})

test('converts headings, lists, and inline formatting to HTML', () => {
  const html = convertMarkdown('# Title\n\n- **First**\n- Second')

  assert.match(html, /<h1>Title<\/h1>/)
  assert.match(html, /<li><strong>First<\/strong><\/li>/)
  assert.match(html, /<li>Second<\/li>/)
})

test('preserves Mermaid fences for the frontend renderer', () => {
  const html = convertMarkdown('```mermaid\nflowchart TD\n  A --> B\n```')

  assert.match(html, /<code class="language-mermaid">/)
  assert.match(html, /A --&gt; B/)
})

test('allows WordPress media URLs and site asset paths', () => {
  const html = convertMarkdown(
    '![Photo](https://manage.ka2.org/assets/uploads/2026/11/photo.webp)\n\n![Logo](/assets/uploads/logo.svg)',
  )

  assert.match(html, /src="https:\/\/manage\.ka2\.org\/assets\/uploads\/2026\/11\/photo\.webp"/)
  assert.match(html, /src="\/assets\/uploads\/logo\.svg"/)
})

test('rejects local image paths that would not be uploaded automatically', () => {
  assert.throws(
    () => convertMarkdown('![Photo](./images/photo.webp)', 'post.md'),
    /post\.md: image "\.\/images\/photo\.webp".*Upload local images/,
  )
})

test('escapes raw HTML in Markdown input', () => {
  const html = convertMarkdown('<script>alert(1)</script>')

  assert.match(html, /&lt;script&gt;/)
  assert.doesNotMatch(html, /<script>/)
})
