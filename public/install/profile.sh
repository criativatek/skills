#!/usr/bin/env bash
# Instala um perfil de orquestração a partir de skills.criativatek.com.
#
#   curl -fsSL https://skills.criativatek.com/install/profile.sh | bash -s -- --profile quality --dry-run
#
# Windows: correr em Git Bash, como o resto dos blocos do guia.
# Precisa de node (já lá está — o Claude Code corre em node).
#
# Este ficheiro só arranca: descarrega o instalador e o renderer para uma pasta
# temporária e passa-lhes os argumentos. A lógica toda vive no apply.mjs.

set -euo pipefail

BASE_URL="${PROFILE_BASE_URL:-https://skills.criativatek.com}"

if ! command -v node > /dev/null 2>&1; then
  echo "erro: preciso de node no PATH" >&2
  exit 1
fi

workDirectory="$(mktemp -d)"
trap 'rm -rf "$workDirectory"' EXIT

for file in render.mjs apply.mjs; do
  if ! curl -fsSL "$BASE_URL/install/$file" -o "$workDirectory/$file"; then
    echo "erro: não consegui descarregar $BASE_URL/install/$file" >&2
    exit 1
  fi
done

node "$workDirectory/apply.mjs" --base-url "$BASE_URL" "$@"
