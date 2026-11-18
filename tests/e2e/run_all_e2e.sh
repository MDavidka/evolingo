#!/usr/bin/env bash
set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NODE_BIN="$(which node || echo "/usr/bin/node")"

echo "================================================================="
echo "               Evolingo Native iOS & Backend E2E Runner          "
echo "================================================================="
echo "Node version:      $($NODE_BIN --version)"
echo "Working directory: /root/evolingo"
echo "Runner script:     $SCRIPT_DIR/runner.js"
echo "Results output:    $SCRIPT_DIR/e2e_results.json"
echo "Timestamp:         $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "================================================================="
echo ""

# Execute master runner with provided arguments or full 4-tier default
"$NODE_BIN" "$SCRIPT_DIR/runner.js" "$@"
EXIT_CODE=$?

# Verify output artifact integrity
if [[ ! -s "$SCRIPT_DIR/e2e_results.json" ]]; then
  echo "ERROR: $SCRIPT_DIR/e2e_results.json is missing or empty!" >&2
  exit 1
fi

exit $EXIT_CODE
