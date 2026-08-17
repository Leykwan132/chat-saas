import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import test from 'node:test'

test('loads and configures the Google Ads conversion ID', () => {
  const documentHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8')

  assert.match(documentHtml, /https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=AW-17745887902/)
  assert.match(documentHtml, /gtag\('config', 'AW-17745887902'\)/)
})
