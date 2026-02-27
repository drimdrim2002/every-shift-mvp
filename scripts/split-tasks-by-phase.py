#!/usr/bin/env python3
"""
Split tasks.json into 9 phase files based on Development Phase categorization.
"""

import json
import os
from pathlib import Path

# Phase mapping based on task analysis
PHASE_MAPPING = {
    "phase-0-infrastructure": {
        "label": "Infrastructure Setup",
        "description": "Project setup, packages, build tools, linting",
        "task_ids": [
            "b3449519-413b-40ec-9cea-c8adc211e52e",  # Vite 프로젝트 생성
            "a9fde6bf-3e9d-426a-ad89-3f07d29186b7",  # UI 및 스타일링 패키지 설치
            "57b08cdd-f193-4475-85e3-148f0af29c8c",  # Tailwind CSS 커스텀 색상
            "cc672606-607c-4315-8edb-8ba2d5ab0dbb",  # 그리드 및 상태 관리 패키지
            "cbab63dd-291c-49ba-af19-878efd0b063a",  # 백엔드 연동 패키지
            "b4729e4b-52b4-4536-a781-6f83387b603b",  # 유틸리티 패키지
            "e6ade1e6-1f68-4bf5-9175-a97bae945462",  # 프로젝트 폴더 구조
            "34398a7c-beda-4667-b06b-acb5fb9dc9f5",  # ESLint 및 Prettier
            "5bdb124f-fdd7-4d5a-8ee5-b44b2661c8c1",  # Naive UI Global Config
            "0725e1c4-f74d-4f5f-b1ab-9eb18b4410ec",  # favicon 및 title
        ]
    },
    "phase-1-database": {
        "label": "Database Layer",
        "description": "Supabase setup, schema, RLS, seed data",
        "task_ids": [
            "0c2615ea-94e8-4674-8ba0-eb8297e1a89a",  # Supabase 프로젝트 생성
            "ad6edb9e-3bf9-4f70-9882-0b9c451678f8",  # 환경 변수 설정
            "ef7a9c3d-2b84-4f1a-9e5d-6c7f8a9b0c1d",  # Supabase UUID Extension
            "c44240eb-9148-4a0b-8787-b9560b29af7f",  # 데이터베이스 스키마 마이그레이션
            "1938165e-4b57-43b8-8612-f3cf6d457712",  # Supabase RLS 정책
            "48f3a743-a0ff-4fb3-8970-2877edcbc56e",  # Supabase Seed 데이터
            "86cd143d-005a-4596-8247-f65afd33407b",  # 데이터베이스 마이그레이션 검증
        ]
    },
    "phase-2-foundation": {
        "label": "Foundation Layer",
        "description": "TypeScript types, utilities, API clients, layout components",
        "task_ids": [
            "9b220011-43f5-4bf5-9f1c-1083deab00f8",  # Supabase 클라이언트
            "acd2c70e-193a-4776-bf58-2e3ba7f1011a",  # TypeScript 타입: Schedule
            "7ae710d4-353c-4868-9c98-f5b209dd6468",  # TypeScript 타입: Employee
            "06f80588-a7c5-44ca-883d-8548c0c62e0a",  # TypeScript 타입: Shift
            "8558cd41-39ef-4913-baba-a195cd42bd7b",  # TypeScript 타입: Organization
            "13da374f-1c07-4102-b10c-46f3ac58a447",  # Utility: 날짜 처리
            "2b774c1e-9422-4fc9-aa73-a77faad93f62",  # Utility: 검증 로직
            "7a035827-f29c-4c19-881f-22b926ad3bc1",  # Utility: Excel 내보내기
            "f6820857-3c14-47d1-aef8-0117422bc458",  # Layout: DefaultLayout
            "dd3d84d7-d57f-48c6-b505-4b1b7ecab140",  # Layout: Header
            "539ea1da-e550-4ea6-b425-ebee0ad2bd89",  # Layout: Sidebar
            "b52cad79-2603-4489-a52e-c0c963526239",  # Tailwind CSS 스타일 파일
        ]
    },
    "phase-3-authentication": {
        "label": "Authentication System",
        "description": "Auth store, router guards, login page",
        "task_ids": [
            "eef0919d-036e-417e-9d0b-714748b392da",  # Auth Store
            "e5371342-e3f2-4d8e-b3ea-c340b981456e",  # Router: Vue Router 설정
            "cca8e5ae-0686-4e03-b2ee-5e18cbba0dfd",  # Login 페이지
            "ab08ce06-628c-4add-84a3-82ecfa564fd8",  # Organization Store
        ]
    },
    "phase-4-step1-2": {
        "label": "Step 1-2 Pages",
        "description": "Basic info and site requirements pages",
        "task_ids": [
            "2fea27dc-6a6a-4ffb-a713-65a3561d4e7a",  # Schedule Store
            "343bb7c4-3925-49ee-91da-1c926056b3f3",  # StepIndicator
            "815ca0d3-e230-4c3e-9905-98ad90e66d66",  # Step 1: 기본 정보 페이지
            "43d82d62-c79b-448a-85e1-c955ae429469",  # Step 2: useSiteRequirements
            "a9d0b427-ea0b-462a-9f08-f66ef061af94",  # Step 2: 사이트 정보 페이지
            "98db6fe2-558a-43cb-9cbd-80815b845d67",  # ShiftSelector
        ]
    },
    "phase-5-step3-grid": {
        "label": "Step 3 Grid (Core Component)",
        "description": "30×36 grid component (80% development effort)",
        "task_ids": [
            "ecef5ddf-8b06-40aa-93b6-2cb6459b516d",  # useScheduleGrid Composable
            "0cf02d47-06cb-4311-87eb-72a2a9dde547",  # useScheduleGridStatistics
            "45ec9e06-2657-4220-b74e-771846bb1efe",  # ScheduleGrid - 기본 구조
            "a3c0894c-9371-42b9-a74b-66fed98b06f4",  # ScheduleGrid - 3-level 헤더
            "554e3f6a-f3ca-48b9-bf2a-078981c219b5",  # ScheduleGrid - ShiftSelector 통합
            "d366f4b1-0468-4a6a-8669-96658ae01e6c",  # ScheduleGrid - 통계 행/열
            "51569871-de57-4fd6-9084-f4435e474ef8",  # Step 3: 페이지 기본 구조
            "27f7dba4-d851-4f13-a47a-44c0729115bf",  # Step 3: ScheduleGrid 통합
            "901fa56f-b908-4784-8486-660993f1ecdc",  # Step 3: 전월 데이터 검증
            "1b7c4930-77fb-4604-89b5-519dab1c560b",  # Step 3: LocalStorage
            "416df5b8-2373-4984-ae52-d0d92ebe139f",  # Step 3: 셀 렌더링
            "f9ce7472-2bd7-41bb-b8d8-1d004a8ea947",  # Step 3: 실시간 통계
            "fa3cea3d-c35e-4994-9e04-1ef8e36e61b0",  # Step 3: 그리드 초기화
            "869ce64c-35c1-49eb-a340-39d6b1c524f4",  # Step 3: AI Solver Polling UI
            "c85b26a3-1777-46dc-bc10-689ead894a01",  # StatisticsSummary
            "d51c33e6-b453-4137-9177-e240f49bd6ae",  # LoadingModal
            "c49d7612-e612-490a-925f-bfa565c5d329",  # useScheduleGridInit
            "4c0036b1-9fb7-413a-b472-61ae9629d1d9",  # useScheduleGridPersistence
        ]
    },
    "phase-6-step4-results": {
        "label": "Step 4 Results & Export",
        "description": "Results page, AI solver, Excel export",
        "task_ids": [
            "00b3779f-aa01-4e72-9fa6-592070829b50",  # AI Solver Mock API
            "1acadf16-0806-4386-b005-ebf1804a01d6",  # useAISolver Composable
            "4e11a307-d943-4f6a-881a-903d99c71007",  # Schedule API
            "945c0f8b-546f-4da7-9456-9595da70377d",  # Step 4: 결과 페이지 기본 구조
            "2c4fa9a8-721e-4a49-a87e-cb65b12b2cf0",  # Step 4: 결과 그리드 통합
            "d887d81f-3a81-4855-9f9d-f7a3452d22ee",  # Step 4: Excel 다운로드
            "af35c607-9eef-49e6-8c2e-de6dd0b996ac",  # Step 4: AI 결과 로드
            "65ea57ca-d50b-4ae6-a962-7f51f3d5facf",  # Step 4: 수동 편집
        ]
    },
    "phase-7-integration": {
        "label": "Integration & Testing",
        "description": "Connecting steps, validation, E2E testing",
        "task_ids": [
            "8f3056c8-375e-4ca3-8330-5dc40a5d9ed4",  # Step 3→Step 4 연결
            "42f3b4a9-a4ca-45d5-9bbc-47777a1abd44",  # App.vue
            "c1cac503-c724-4dae-ac95-7b014172a905",  # main.ts
            "465736f0-3781-40e2-99ff-ac3be05b0214",  # Step 1: 월 선택 통합
            "2f033c77-b3b8-4907-957e-e5b9061fa837",  # Step 2: 데이터 바인딩
            "b1997dac-fe81-457f-ad80-dd32b2a14d8e",  # Step 2: 데이터 저장
            "4d33bb07-3036-46b1-9051-31faf7a3a581",  # AI Solver 에러 핸들링
            "7270b220-cc07-4802-bef3-5974f26e1800",  # Router Guards
            "68519a69-7785-4fff-91c8-3c490fdb1753",  # E2E 통합 테스트
            "8306345b-acff-4242-bfd3-55a78be58ae5",  # Mock AI Solver 검증
            "7f84da9e-4c5a-40b1-9be4-6e2aa030bec8",  # Excel 다운로드 검증
            "bc00251e-be39-4f2b-a2cc-b51dc7a11945",  # .env.example
        ]
    },
    "phase-8-polish": {
        "label": "Polish & Documentation",
        "description": "Performance, UI refinement, documentation",
        "task_ids": [
            "24cbc1e5-a25f-4aba-b632-4e55fb3eab77",  # 그리드 성능 최적화
            "098baa43-dff9-41e3-8383-38761507e536",  # 통계 계산 검증
            "9721fba1-bb53-4cb4-b64d-d021df12bb9e",  # UI 폴리싱
            "34a97052-284a-456e-9286-f0dd59bc1cd4",  # README.md
            "926489c1-82ae-4e2f-a99e-0469ef1882d3",  # 개발자 가이드
            "3185a249-b1b6-47d9-9a69-748d1ea393bb",  # Seed 데이터 문서화
            "4729632d-e238-4339-8315-22b77ecf8df6",  # API 문서
            "ec5b2181-88a5-4fba-a6a5-3a578566f26a",  # 데모 시나리오
            "70a4032a-5c90-417b-b4a7-0a5ebfd250ef",  # 테스트 데이터 준비
            "6ee01e19-d024-4fb0-9d9b-6beee4a8fef5",  # 스크린샷 캡처
        ]
    }
}

def main():
    # Paths
    project_root = Path("/home/brown/projects/every-shift-mvp")
    tasks_file = project_root / ".shrimp-data" / "tasks.json"
    tasks_dir = project_root / ".shrimp-data" / "tasks"

    # Read original tasks.json
    print(f"Reading {tasks_file}...")
    with open(tasks_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    tasks = data.get('tasks', [])
    print(f"Loaded {len(tasks)} tasks")

    # Create task ID to task mapping
    task_map = {task['id']: task for task in tasks}

    # Split tasks by phase
    phase_tasks = {}
    assigned_ids = set()

    for phase_key, phase_info in PHASE_MAPPING.items():
        phase_tasks[phase_key] = {
            "metadata": {
                "phase": phase_key,
                "label": phase_info["label"],
                "description": phase_info["description"],
                "taskCount": len(phase_info["task_ids"])
            },
            "tasks": []
        }

        for task_id in phase_info["task_ids"]:
            if task_id in task_map:
                phase_tasks[phase_key]["tasks"].append(task_map[task_id])
                assigned_ids.add(task_id)
            else:
                print(f"WARNING: Task ID {task_id} not found in tasks.json")

    # Check for unassigned tasks
    all_task_ids = set(task_map.keys())
    unassigned_ids = all_task_ids - assigned_ids

    if unassigned_ids:
        print(f"\nWARNING: {len(unassigned_ids)} tasks not assigned to any phase:")
        for task_id in unassigned_ids:
            task = task_map[task_id]
            print(f"  - {task_id}: {task.get('name', 'N/A')}")

    # Write phase files
    print(f"\nWriting phase files to {tasks_dir}...")
    tasks_dir.mkdir(parents=True, exist_ok=True)

    for phase_key, phase_data in phase_tasks.items():
        output_file = tasks_dir / f"{phase_key}.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(phase_data, f, ensure_ascii=False, indent=2)
        print(f"  ✓ {output_file.name} ({len(phase_data['tasks'])} tasks)")

    # Summary
    print(f"\n✅ Successfully split {len(tasks)} tasks into {len(PHASE_MAPPING)} phase files")
    print(f"\nPhase distribution:")
    for phase_key, phase_data in phase_tasks.items():
        print(f"  {phase_key}: {len(phase_data['tasks'])} tasks")

    return 0

if __name__ == "__main__":
    exit(main())
