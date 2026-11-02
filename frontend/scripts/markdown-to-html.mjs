import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import MarkdownIt from 'markdown-it'

const markdown = new MarkdownIt({ html: false, linkify: true })

export function convertMarkdown(source, sourceName = 'input') {
  const tokens = markdown.parse(source, {})
  const images = tokens
    .filter(token => token.type === 'inline')
    .flatMap(token => token.children ?? [])
    .filter(token => token.type === 'image')

  for (const image of images) {
    const src = image.attrGet('src') ?? ''
    if (!/^https:\/\//i.test(src) && !src.startsWith('/assets/')) {
      throw new Error(
        `${sourceName}: image "${src}" must use an HTTPS URL or a root-relative /assets/ URL. ` +
        'Upload local images to the WordPress Media Library first.',
      )
    }
  }

  return markdown.renderer.render(tokens, markdown.options, {})
}

export function parseInputArgs(args) {
  const positional = args[0] === '--' ? args.slice(1) : args
  const parsed = { input: undefined, output: undefined, help: false }

  for (let i = 0; i < positional.length; i++) {
    const arg = positional[i]
    if (arg === '--help' || arg === '-h') {
      parsed.help = true
    }
    else if (arg === '--output' || arg === '-o') {
      if (parsed.output || !positional[i + 1] || positional[i + 1].startsWith('-')) {
        throw new Error(`${arg} requires exactly one output file path.`)
      }
      parsed.output = positional[++i]
    }
    else if (arg.startsWith('-')) {
      throw new Error(`Unknown option: ${arg}`)
    }
    else if (parsed.input) {
      throw new Error('Provide exactly one input Markdown file.')
    }
    else {
      parsed.input = arg
    }
  }

  if (!parsed.help && !parsed.input) {
    throw new Error('Provide an input Markdown file.')
  }
  return parsed
}

export function resolveInputPath(input) {
  const windowsPath = process.platform === 'win32'
    ? input.replace(/^\/([a-z])\//i, (_, drive) => `${drive.toUpperCase()}:/`)
    : input
  return resolve(windowsPath)
}

export function decodeUtf8(buffer, sourceName) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer).replace(/^\uFEFF/, '')
  }
  catch (error) {
    throw new Error(`${sourceName}: input must be UTF-8 encoded.`, { cause: error })
  }
}

async function main() {
  const args = process.argv.slice(2)
  let parsed
  try {
    parsed = parseInputArgs(args)
  }
  catch (error) {
    process.stderr.write(`${error.message}\nUsage: pnpm markdown:html [--] <article.md> [--output <article.html>]\n`)
    process.exitCode = 2
    return
  }

  if (parsed.help) {
    process.stderr.write('Usage: pnpm markdown:html [--] <article.md> [--output <article.html>]\n')
    return
  }

  const file = resolveInputPath(parsed.input)
  const source = decodeUtf8(await readFile(file), file)
  const html = convertMarkdown(source, file)
  if (parsed.output) {
    await writeFile(resolveInputPath(parsed.output), html, { encoding: 'utf8' })
  }
  else {
    process.stdout.write(html, 'utf8')
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await main()
}
