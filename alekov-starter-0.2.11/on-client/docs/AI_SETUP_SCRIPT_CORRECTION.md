# AI_SETUP_GUIDE.md 실행 스크립트 정정

[AI_SETUP_GUIDE.md](AI_SETUP_GUIDE.md)의 준비 절에서 스크립트 목록을 `start`·`demo`·`check`로 바로잡았습니다. README와 학생 실행·구현 문서의 중복 설명도 현재 [package.json](../package.json)과 대조했습니다. 실행 명령의 기준은 이 설정 파일입니다.

| 현재 명령 | 실제 정의된 동작 |
|---|---|
| `npm start` | `node src/server.mjs` |
| `npm run demo` | `node src/server.mjs --demo` |
| `npm run check` | `node --check student/extension.mjs` |

`test` 스크립트는 정의되어 있지 않습니다. `node --check student/extension.mjs`는 `check` 스크립트가 수행하는 구문 검사 명령입니다.

학생 앱 실행은 별도 안내인 [STUDENT_RUNBOOK.md](STUDENT_RUNBOOK.md) 및 [STUDENT_LAUNCH_GUIDE.md](STUDENT_LAUNCH_GUIDE.md)의 PowerShell 실행 명령을 따릅니다. 기준 Node.js 버전은 `package.json`에서 `24.19.0`으로 확인했으며, 실제 PC 설치 버전과 실행 결과는 확인하지 않았습니다. 이 문서를 작성하며 npm 스크립트를 실행하지 않았습니다.

기존 `AI_SETUP_GUIDE.md`의 다른 승인·연결 설명을 이 문서로 바꾸어 해석하지 마세요. 계정 권한·AI 연결은 운영자 준비가 필요하고, 비밀값을 입력하거나 복사하지 않습니다.
