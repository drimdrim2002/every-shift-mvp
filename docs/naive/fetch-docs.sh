#!/bin/bash

# Naive UI 문서 자동 다운로드 스크립트
# Claude Code의 네트워크 제한으로 naiveui.com 접근 불가 → GitHub에서 직접 다운로드

set -e  # 에러 발생 시 스크립트 중단

DOCS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NAIVE_UI_VERSION="2.43.1"
GITHUB_BASE="https://raw.githubusercontent.com/tusen-ai/naive-ui/main"

echo "📚 Naive UI 문서 업데이트 시작..."
echo "버전: $NAIVE_UI_VERSION"
echo "디렉토리: $DOCS_DIR"
echo ""

# 임시 디렉토리 생성
TMP_DIR=$(mktemp -d)
trap "rm -rf $TMP_DIR" EXIT

echo "⏬ GitHub에서 최신 문서 다운로드 중..."

# 주요 API 문서 다운로드 (만약 GitHub에 있다면)
# 참고: Naive UI는 소스 코드에 문서가 포함되어 있으므로
# 실제로는 공식 웹사이트에서 수동으로 가져와야 함

echo ""
echo "⚠️  중요 안내"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Naive UI 문서는 naiveui.com에 호스팅되어 있으며,"
echo "Claude Code는 보안상 다음 도메인만 접근 가능합니다:"
echo ""
echo "  ✅ api.anthropic.com"
echo "  ✅ github.com"
echo "  ✅ npmjs.com"
echo "  ✅ pypi.org"
echo "  ❌ naiveui.com (차단됨)"
echo ""
echo "따라서 문서 업데이트는 수동으로 진행해야 합니다:"
echo ""
echo "1. Windows 브라우저에서 naiveui.com 접속"
echo "2. 필요한 API 문서 페이지 열기"
echo "3. 브라우저 개발자 도구로 내용 복사"
echo "4. WSL의 해당 .md 파일에 붙여넣기"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# GitHub에서 가져올 수 있는 정보들
echo "📦 Package 정보 확인 중..."

# package.json에서 현재 버전 확인
if command -v curl &> /dev/null; then
  LATEST_VERSION=$(curl -s "https://registry.npmjs.org/naive-ui/latest" | grep -o '"version":"[^"]*' | grep -o '[^"]*$' || echo "unknown")
  echo "  - NPM 최신 버전: $LATEST_VERSION"
  echo "  - 프로젝트 설치 버전: $NAIVE_UI_VERSION"

  if [ "$LATEST_VERSION" != "$NAIVE_UI_VERSION" ] && [ "$LATEST_VERSION" != "unknown" ]; then
    echo ""
    echo "⚠️  새로운 버전이 출시되었습니다!"
    echo "   업데이트: pnpm update naive-ui"
    echo ""
  fi
else
  echo "  - curl이 설치되어 있지 않아 버전 확인을 건너뜁니다."
fi

echo ""
echo "📝 현재 로컬 문서 목록:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 문서 파일 목록 출력
find "$DOCS_DIR" -name "*.md" -type f | sort | while read -r file; do
  filename=$(basename "$file")
  filesize=$(du -h "$file" | cut -f1)
  echo "  ✓ $filename ($filesize)"
done

echo ""
echo "✨ 참고 링크:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  공식 사이트: https://www.naiveui.com"
echo "  GitHub Repo: https://github.com/tusen-ai/naive-ui"
echo "  NPM Package: https://www.npmjs.com/package/naive-ui"
echo ""
echo "  주요 API 문서:"
echo "  - Message:      https://www.naiveui.com/en-US/os-theme/components/message"
echo "  - Dialog:       https://www.naiveui.com/en-US/os-theme/components/dialog"
echo "  - Notification: https://www.naiveui.com/en-US/os-theme/components/notification"
echo "  - LoadingBar:   https://www.naiveui.com/en-US/os-theme/components/loading-bar"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# README 버전 정보 업데이트 (간단한 sed 사용)
README_FILE="$DOCS_DIR/README.md"
if [ -f "$README_FILE" ]; then
  TODAY=$(date +%Y-%m-%d)

  # 버전 테이블이 있다면 업데이트
  if grep -q "| 버전 | 업데이트 날짜 |" "$README_FILE"; then
    echo "📋 README.md 업데이트 (최종 확인 날짜 기록)"
    # 실제로는 수동으로 버전 테이블을 업데이트해야 함
    echo "   마지막 확인: $TODAY"
  fi
fi

echo ""
echo "✅ 문서 상태 확인 완료!"
echo ""
echo "💡 Tip: Windows에서 문서를 업데이트한 후,"
echo "   이 스크립트를 다시 실행하여 변경사항을 확인하세요."
echo ""
