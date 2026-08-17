// Imprime o bloco do CLAUDE.md que o perfil Standard produz.
// Serve para comparar com o que já está numa máquina antes de instalar.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import { resolveProfile, renderClaudemdBlock } from '../public/install/render.mjs'

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

const profileId = process.argv[2] || 'standard'
const base = JSON.parse(readFileSync(join(repositoryRoot, 'public/profiles/base.json'), 'utf8'))
const profile = JSON.parse(readFileSync(join(repositoryRoot, `public/profiles/${profileId}.json`), 'utf8'))

process.stdout.write(renderClaudemdBlock(resolveProfile(base, profile)))
