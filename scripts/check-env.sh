#!/usr/bin/env bash
# Quick environment sanity check. Non-destructive — only reports status.
set -u

ok=0
fail=0

check() {
  local name=$1 cmd=$2 expected=$3
  if eval "$cmd" >/dev/null 2>&1; then
    local got
    got=$(eval "$cmd" 2>/dev/null || true)
    echo "  [ok]   $name → $got (expected $expected)"
    ok=$((ok + 1))
  else
    echo "  [miss] $name not found (expected $expected)"
    fail=$((fail + 1))
  fi
}

echo "Environment check for 'The Feed Looks Back'"
echo

check "node"       "node --version"        ">=22 <23"
check "pnpm"       "pnpm --version"        "9.x (see package.json packageManager)"
check "git"        "git --version"         "any"
check "gitleaks"   "gitleaks version"      "8.21.x (pre-commit hook)"
check "ffmpeg"     "ffmpeg -version | head -n 1" "any (scripts/record-demo.sh)"
check "chromium"   "chromium --version || chrome --version || google-chrome --version" "any (manual demo)"

echo

if [[ -n "${ANTHROPIC_API_KEY:-}" ]]; then
  len=${#ANTHROPIC_API_KEY}
  echo "  [ok]   ANTHROPIC_API_KEY is set (length=$len)"
  ok=$((ok + 1))
else
  echo "  [warn] ANTHROPIC_API_KEY is not set (required only when USE_REAL_API=true)"
fi

echo
echo "Summary: $ok ok, $fail missing"
exit $([[ $fail -eq 0 ]] && echo 0 || echo 1)
