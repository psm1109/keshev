# 내 보안 Agent 시작 틀 0.2.11

이 보안 Agent는 회사 직원이 자기 로그인 상태, 기기·세션 상태, 업무 앱 접속 결과, 최근 접속 기록과 저장된 보안 경보를 확인하는 보안 앱입니다. 13단계부터 22단계까지 이 프로젝트 하나로 화면을 채워 갑니다. 처음이라면 [학생 시작 안내](docs/GETTING_STARTED_STUDENT.md)를 먼저 읽습니다.

이 시작 틀만으로 단계 통과나 실제 회사 시스템 연결을 뜻하지 않습니다. 학생 표시 구현은 `student/extension.mjs`에 두며, 제공 UI·서버가 조회·요청·검증한 자료를 표시합니다. 함수별 설명과 현재 모듈 데이터 흐름은 [현재 구현·구성 안내](docs/STUDENT_IMPLEMENTATION_NOTES.md)에, 실행 절차는 [학생 실행 안내](docs/STUDENT_RUNBOOK.md)에 정리되어 있습니다.

## 켜기

`package.json`은 Node.js `24.19.0`을 지정하고 외부 npm 의존성은 없습니다. 실제 PC에 설치된 Node.js 버전은 사용자가 확인해야 합니다. 이 `on-client` 폴더에서 PowerShell을 열고 아래를 실행한 뒤 PC 브라우저에서 `http://127.0.0.1:5189/`을 엽니다. 자세한 켜기·끄기·재실행 순서는 [학생 실행 안내](docs/STUDENT_RUNBOOK.md)와 [실행 가이드](docs/STUDENT_LAUNCH_GUIDE.md)를 봅니다.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\start-alekov.ps1
```

`package.json`에 정의된 명령은 다음과 같습니다.

| 명령 | 동작 |
|---|---|
| `npm start` | 기본 로컬 서버 실행 |
| `npm run demo` | 예제 자료로 실행(실제 시스템 연결이 아님) |
| `npm run check` | `student/extension.mjs`의 JavaScript 문법 검사 |

`test` 스크립트는 현재 `package.json`에 정의되어 있지 않습니다. 서버가 켜졌다는 메시지는 브라우저와 로컬 서버의 응답만 뜻하며, SDP·AI 게이트·OSV의 실제 연결을 증명하지 않습니다. `demo`도 예제 자료이며 실제 연결이나 성취가 아닙니다. 위 명령은 문서와 `package.json`을 대조한 내용으로, 이 안내를 작성하며 실행하지 않았습니다.

## 현재 코드의 역할 경계

- 학생 표시 함수는 `student/extension.mjs`에 있습니다. `renderIdentity`, `renderDecision`, `renderEvents`, `renderStatus`, `renderAiConnection`, `renderExplanation`, `renderAction`, `renderVulnerabilities`의 현재 목적은 [현재 구현·구성 안내](docs/STUDENT_IMPLEMENTATION_NOTES.md)에서 함수별로 확인할 수 있습니다.
- `public/app.js`와 `public/`의 보조 모듈은 제공 UI로 메뉴·요청·새로고침을 담당하고 학생 표시 함수를 호출합니다.
- `src/server.mjs`, `src/engine.mjs`, `src/engine/`, `src/ai/`, `src/actions/`, `src/vulnerabilities/` 및 `vendor/`는 제공 서버·연결·검증 코드입니다. 요청 전송, 응답·권한 확인, 외부 연결 및 처리 결과 반환은 이 제공 경계가 담당합니다. 학생 표시 함수가 제공 서버의 실제 동작이나 외부 권한을 대신하지 않습니다.
- 기본 엔진은 연결 없음 상태이며, 예제 모드는 실제 연결이 아닙니다. 운영자 설정·계정 권한이 준비되지 않으면 학생 코드만으로 SDP 또는 AI를 연결할 수 없습니다. OSV 조회도 승인된 공개 패키지 범위의 조회이지 앱 전체 안전 보증이 아닙니다.
- AI 설명은 참고 정보입니다. 제안은 실제 조치 집행이 아닙니다. 현재 본인 보안 기록에서 지원 조치가 비어 있을 수 있으며, 실제 원천의 조치 집행 연결·운영 권한은 별도 확인 대상입니다.

## 지킬 것

- 기존 1~3차 프로젝트와 학생 파일은 지우거나 덮어쓰지 않습니다. 새 폴더에서 시작하거나 이미 하던 프로젝트를 보존해 이어 씁니다.
- AI 열쇠·비밀번호·토큰을 코드, 커밋, 캡처, 도움정보, 문서에 넣지 않습니다. 주소나 열쇠를 직접 입력하는 칸을 만들지 않습니다.
- 제공 파일(`public/`, `src/`, `vendor/`)과 인증·판정 코드는 과제 안내가 허용하지 않는 한 수정하지 않습니다.
- 실제로 확인하지 않은 실행·연결·화면 결과를 완료라고 기록하지 않습니다.

## 더 읽을 곳

- 단계별 안내와 AI 요청문: [docs/STUDENT_PROMPTS.md](docs/STUDENT_PROMPTS.md)
- 단계별 확인 계약: [docs/CURRICULUM.json](docs/CURRICULUM.json), [docs/IMPLEMENTATION_CONTRACT.md](docs/IMPLEMENTATION_CONTRACT.md)
- 앱 실행·구성도·기능·오류 순서: [docs/STUDENT_RUNBOOK.md](docs/STUDENT_RUNBOOK.md) 및 [docs/STUDENT_IMPLEMENTATION_NOTES.md](docs/STUDENT_IMPLEMENTATION_NOTES.md)
- 22단계 새 환경 재현 절차·관찰 기록·버전 상태: [docs/STUDENT_REPRODUCTION_RECORD.md](docs/STUDENT_REPRODUCTION_RECORD.md)
- AI 설정 문서의 스크립트 목록 정정 참고: [docs/AI_SETUP_SCRIPT_CORRECTION.md](docs/AI_SETUP_SCRIPT_CORRECTION.md)
- 오류 코드별 해결: [docs/CONNECTION_TROUBLESHOOT.md](docs/CONNECTION_TROUBLESHOOT.md)
- 시작 틀 업데이트(내 파일 보존): [docs/STARTER_UPDATE.md](docs/STARTER_UPDATE.md)
- 실제 SDP·앱 AI 연결은 담당자가 별도 안내할 때만 사용합니다: [docs/SDP_HOST_CONNECTION.md](docs/SDP_HOST_CONNECTION.md), [docs/AI_SETUP_GUIDE.md](docs/AI_SETUP_GUIDE.md). 기본 앱 실행 및 13~16단계 표시 작업의 전제 조건은 아니지만, 이후 단계의 실제 연결 기능은 해당 단계별 기준에 따라 별도로 확인해야 합니다.

README는 현재 기능을 개괄하고 자세한 함수·구성 설명은 연결된 학생 문서에서 관리합니다. `package.json`과 모순되는 명령은 실행하지 말고 현재 스크립트 설정을 따릅니다.
