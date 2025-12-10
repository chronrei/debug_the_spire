// 로그 출력 함수
export function log(message) {
    const container = document.getElementById("battle-log-container");
    if (!container) return;

    // 1. 새로운 줄 생성
    const entry = document.createElement("div");
    entry.className = "log-entry";
    entry.innerText = `> ${message}`; // 앞에 화살표 추가

    // 2. 컨테이너에 추가
    container.appendChild(entry);

    // 3. 자동 스크롤 (가장 아래로)
    container.scrollTop = container.scrollHeight;
}

// [신규] 로그 초기화 함수
export function clearLog() {
    const container = document.getElementById("battle-log-container");
    if (container) {
        container.innerHTML = "";
        // 시작 메시지 하나는 남겨두기 (선택사항)
        log("Battle system initialized...");
    }
}

// 배열 섞기 (Fisher-Yates Shuffle)
export function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}