#!/bin/bash
# ═══════════════════════════════════════════════════════════
# 🔥 ZINC Stress Test Suite Runner
# ═══════════════════════════════════════════════════════════
# Runs all k6 stress test scenarios sequentially with 
# a 15-second cooldown between each.
#
# Usage:
#   ./stress-tests/k6/run-all.sh              # Run all
#   ./stress-tests/k6/run-all.sh 02            # Run specific scenario
#   ./stress-tests/k6/run-all.sh --quick       # Quick mode (half duration)
#
# Prerequisites:
#   - k6 installed: https://grafana.com/docs/k6/latest/set-up/install-k6/
#   - Fedora/RHEL: sudo dnf install k6
#   - macOS: brew install k6
#   - Or: go install go.k6.io/k6@latest
# ═══════════════════════════════════════════════════════════

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCENARIOS_DIR="${SCRIPT_DIR}/scenarios"
REPORTS_DIR="${SCRIPT_DIR}/../reports"
COOLDOWN=15

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Create reports directory
mkdir -p "${REPORTS_DIR}"

echo -e "\n${BOLD}${CYAN}═══════════════════════════════════════════${NC}"
echo -e "${BOLD}${CYAN}  🔥 ZINC Stress Test Suite${NC}"
echo -e "${BOLD}${CYAN}═══════════════════════════════════════════${NC}"
echo -e "  Time: $(date '+%Y-%m-%d %H:%M:%S')"
echo -e "  Reports: ${REPORTS_DIR}"
echo ""

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo -e "${RED}❌ k6 is not installed!${NC}"
    echo ""
    echo "Install k6:"
    echo "  Fedora/RHEL:  sudo dnf install k6"
    echo "  Ubuntu/Deb:   sudo apt install k6"
    echo "  macOS:        brew install k6"
    echo "  Other:        https://grafana.com/docs/k6/latest/set-up/install-k6/"
    exit 1
fi

# Determine which scenarios to run
FILTER="${1:-all}"
PASSED=0
FAILED=0
TOTAL=0

run_scenario() {
    local file="$1"
    local name=$(basename "$file" .js)
    
    TOTAL=$((TOTAL + 1))
    
    echo -e "\n${BOLD}${YELLOW}──────────────────────────────────────${NC}"
    echo -e "${BOLD}${YELLOW}  Running: ${name}${NC}"
    echo -e "${BOLD}${YELLOW}──────────────────────────────────────${NC}"
    
    if k6 run "${file}" 2>&1; then
        echo -e "${GREEN}  ✅ ${name} completed${NC}"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}  ❌ ${name} failed or had threshold violations${NC}"
        FAILED=$((FAILED + 1))
    fi
}

if [ "$FILTER" = "all" ]; then
    # Run all scenarios
    for scenario in "${SCENARIOS_DIR}"/[0-9]*.js; do
        run_scenario "$scenario"
        
        # Cooldown between scenarios
        echo -e "${CYAN}  ⏳ Cooldown ${COOLDOWN}s...${NC}"
        sleep ${COOLDOWN}
    done
elif [ -f "${SCENARIOS_DIR}/${FILTER}"*.js ]; then
    # Run specific scenario
    for f in "${SCENARIOS_DIR}/${FILTER}"*.js; do
        run_scenario "$f"
    done
else
    echo -e "${RED}❌ Scenario '${FILTER}' not found${NC}"
    echo "Available scenarios:"
    ls "${SCENARIOS_DIR}"/*.js 2>/dev/null | while read f; do
        echo "  - $(basename "$f" .js)"
    done
    exit 1
fi

# Final summary
echo -e "\n${BOLD}${CYAN}═══════════════════════════════════════════${NC}"
echo -e "${BOLD}${CYAN}  📊 FINAL RESULTS${NC}"
echo -e "${BOLD}${CYAN}═══════════════════════════════════════════${NC}"
echo -e "  Total:   ${TOTAL}"
echo -e "  Passed:  ${GREEN}${PASSED}${NC}"
echo -e "  Failed:  ${RED}${FAILED}${NC}"
echo -e "  Time:    $(date '+%Y-%m-%d %H:%M:%S')"
echo -e "  Reports: ${REPORTS_DIR}/"

if [ ${FAILED} -eq 0 ]; then
    echo -e "\n  ${GREEN}${BOLD}🎉 ALL TESTS PASSED!${NC}"
else
    echo -e "\n  ${RED}${BOLD}⚠️  ${FAILED} TEST(S) FAILED${NC}"
fi

echo -e "${BOLD}${CYAN}═══════════════════════════════════════════${NC}\n"

exit ${FAILED}
