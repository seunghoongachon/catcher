const patchNotes = [
    {
        date: '2026-09-24',
        version: 'v1.21',
        title: '체험 모드와 CATCHER 브랜딩 개선',
        items: ['비로그인 방문 시 샘플 포트폴리오를 바로 확인하는 체험 모드 제공', '체험 모드에서 사용자명 대신 체험 모드 상태를 표시', 'CATCHER 아이콘과 로그인·회원가입 네비게이션을 서비스 UI에 통일']
    },
    {
        date: '2026-09-22',
        version: 'v1.20',
        title: '국내·해외 주식 포트폴리오 분리',
        items: ['보유 주식을 국내 주식과 해외 주식으로 구분해 표시', '국내 주식·해외 주식별 소계 추가', '마지막에 전체 주식 총합계로 다시 합산']
    },
    {
        date: '2026-09-22',
        version: 'v1.19',
        title: '향후 개발 방향 안내 추가',
        items: ['패치노트 안에 향후 개발 기능과 우선순위를 확인할 수 있는 로드맵 영역 추가', '첫 번째 예정 기능으로 매수 AI(OpenAI) 연동 계획 기록']
    },
    {
        date: '2026-09-22',
        version: 'v1.18',
        title: '매수 프리셋 저장',
        items: ['여러 매수일·매수가·수량 내역을 이름 있는 프리셋으로 저장', '저장된 매수 프리셋 불러오기·삭제 지원', '매수 프리셋을 DB에 저장해 거래 타임라인에서 재사용']
    },
    {
        date: '2026-09-22',
        version: 'v1.17',
        title: 'OCR 환경변수 로딩 개선',
        items: ['서버 시작 시 .env의 OPENAI_API_KEY 자동 로드', 'API 키 누락 시 서버 충돌 없이 설명이 포함된 JSON 오류 반환', 'OCR 설정 예시를 .env.example로 제공']
    },
    {
        date: '2026-09-22',
        version: 'v1.16',
        title: 'AI 거래 스크린샷 자동 등록',
        items: ['증권 거래 스크린샷을 AI 비전 모델로 분석', '매수·매도일, 가격, 수량, 티커를 자동 추출해 DB 저장', '추출된 거래를 타임라인 입력과 차트 마커에 자동 반영']
    },
    {
        date: '2026-09-22',
        version: 'v1.15',
        title: '기존 매도 기록 복원',
        items: ['매도 기회비용 화면에서 기존 DB 매도 기록 불러오기 지원', '저장된 최신 매도가와 수량을 시뮬레이터 입력값에 자동 반영', '거래 타임라인과 기회비용 화면 모두 기존 매도 기록 DB를 유지']
    },
    {
        date: '2026-09-22',
        version: 'v1.14',
        title: '거래 타임라인과 매도 기회비용 분리',
        items: ['실제 다중 매수·매도 기록과 차트 마커를 거래 타임라인 전용 화면으로 분리', '매도 기회비용 계산을 독립 시뮬레이터로 분리해 가정 매도가와 수량만 입력하도록 개선', '두 기능의 입력값·상태·이벤트 리스너를 서로 독립적으로 구성']
    },
    {
        date: '2026-09-22',
        version: 'v1.13',
        title: '다중 매수·매도 시점 추적',
        items: ['매수일·매수가·수량을 여러 건 입력하도록 개선', '각 매수 내역을 실제 매수가 기준의 빨간색 마커로 표시', '매도일·매도가·수량을 저장하고 실제 매도가 기준의 파란색 마커로 표시']
    },
    {
        date: '2026-09-22',
        version: 'v1.12',
        title: '트래커·매수 시뮬레이션 분리',
        items: ['트래커와 매수 시뮬레이션을 별도 메뉴로 분리', '매수일 입력과 그래프 매수·매도 시점 마커 추가', '가격 차트 확대·축소·전체 보기 지원']
    },
    {
        date: '2026-09-22',
        version: 'v1.11',
        title: '트래커 차트·원화 표시 개선',
        items: ['기회비용과 추가 확보 금액에 USD·KRW 동시 표시', '최근 3개월 이상 일봉 가격 추이 차트 제공', '차트에 과거 매도 시점을 빨간색 마커로 강조']
    },
    {
        date: '2026-09-22',
        version: 'v1.10',
        title: '트래커 오류 수정',
        items: ['목표 매수가 없이도 매도 기준 가격·수량만으로 현재가 분석 가능', '매도 기록을 최신 저장 순서로 조회하도록 수정', '매도 수량을 매도 기록에 함께 저장·복원']
    },
    {
        date: '2026-09-22',
        version: 'v1.9',
        title: '복리 프리셋 저장',
        items: ['추가납입 시나리오를 이름 있는 프리셋으로 저장', '저장된 프리셋 불러오기·삭제 지원', '복리 조건과 여러 추가납입 내역을 DB에 저장']
    },
    {
        date: '2026-09-22',
        version: 'v1.8',
        title: '복리계산기 고도화',
        items: ['계좌별 월복리·연복리 10년 그래프 추가', '계산 기간을 1~100년으로 선택', '여러 번의 추가납입과 만원 단위 입력 지원']
    },
    {
        date: '2026-09-22',
        version: 'v1.7',
        title: '전일대비 자산 변동 표시',
        items: ['주식 표에 전일대비 달러·원화 금액과 등락률 추가', '주식 평가금액·총 통합자산 카드에 전일대비 금액과 등락률 표시', '미국 주식 환산 금액을 보유 수량 기준으로 통일']
    },
    {
        date: '2026-09-21',
        version: 'v1.6',
        title: '국내 주식 지원',
        items: ['KOSPI·KOSDAQ 종목 코드 자동 suffix 처리', '국내 종목명 검색 및 한글 표시', '국내 주식 원화 처리와 평가금순 정렬 지원']
    },
    {
        date: '2026-09-21',
        version: 'v1.5',
        title: '통합 자산 포트폴리오',
        items: ['주식·현금자산·총합 화면 통합', '현금자산에 CMA·예적금·증권 예수금 지원', 'USD 계좌 입력과 원화 환산 표시']
    },
    {
        date: '2026-09-21',
        version: 'v1.4',
        title: '관심종목 및 환율 표시',
        items: ['관심종목 직접 추가·삭제 및 새로고침 지원', 'USD/KRW 환율 조회와 원화 환산 표시', '관심종목 등락률 색상 표시']
    },
    {
        date: '2026-09-20',
        version: 'v1.3',
        title: '트래커 & 재진입 시뮬레이터',
        items: ['매도 수량 기반 기회비용 계산', '재진입 매수가·수량 기반 손익 시뮬레이션', '매도 시점과 현재가 비교 차트 추가']
    },
    {
        date: '2026-09-20',
        version: 'v1.0',
        title: 'CATCHER 시작',
        items: ['포트폴리오 저장·조회 기능 추가', '주식 평가금액과 투자금 계산', '포트폴리오·트래커 탭 구조 구성']
    }
];

const developmentRoadmap = [
    {
        status: '진행 예정',
        title: '매수 AI(OpenAI) 연동',
        description: '사용자의 종목·매수일·매수가·수량과 투자 목적을 바탕으로 분할매수 전략, 목표 가격, 위험 요인을 AI가 정리하도록 확장합니다.',
        details: 'OpenAI API 키를 안전하게 서버에서 관리하고, 사용자가 요청한 경우에만 분석하도록 구성할 예정입니다.'
    }
];

const renderDevelopmentRoadmap = () => {
    const container = document.getElementById('roadmapList');
    if (!container) return;
    container.innerHTML = developmentRoadmap.map((item) => `
        <article class="rounded-md border border-violet-200 bg-white p-4" title="${item.details}">
            <div class="flex flex-wrap items-center gap-2 mb-1">
                <h4 class="font-bold text-gray-900">${item.title}</h4>
                <span class="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">${item.status}</span>
            </div>
            <p class="text-sm text-gray-700">${item.description}</p>
            <p class="mt-2 text-xs text-gray-500">ⓘ 세부 계획은 항목에 마우스를 올리면 확인할 수 있습니다.</p>
        </article>
    `).join('');
};

const renderPatchNotes = () => {
    const container = document.getElementById('patchNotesList');
    if (!container) return;
    container.innerHTML = patchNotes.map((note) => `
        <article class="border border-gray-200 rounded-lg p-4 hover:border-indigo-200 transition">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
                <h3 class="font-bold text-gray-900">${note.title}</h3>
                <span class="text-xs text-indigo-600 font-semibold">${note.version} · ${note.date}</span>
            </div>
            <ul class="list-disc list-inside space-y-1 text-sm text-gray-600">
                ${note.items.map((item) => `<li>${item}</li>`).join('')}
            </ul>
        </article>
    `).join('');
};

renderDevelopmentRoadmap();
renderPatchNotes();
