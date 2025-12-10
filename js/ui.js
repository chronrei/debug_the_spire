import { log } from './util.js';

// 1. 전체 UI 업데이트
export function updateUI(state) {
    // 플레이어
    document.getElementById("player-hp").innerText = state.player.hp;
    document.getElementById("player-max-hp").innerText = state.player.maxHp;
    document.getElementById("player-hp-fill").style.width = (state.player.hp / state.player.maxHp * 100) + "%";
    document.getElementById("player-mana").innerText = state.player.mana;
    document.getElementById("player-block").innerText = state.player.block;

    // 적
    document.getElementById("enemy-name").innerText = "👾 " + state.enemy.name;
    document.getElementById("enemy-hp").innerText = Math.max(0, state.enemy.hp);
    document.getElementById("enemy-max-hp").innerText = state.enemy.maxHp;
    const hpPercent = (Math.max(0, state.enemy.hp) / state.enemy.maxHp * 100);
    document.getElementById("enemy-hp-fill").style.width = hpPercent + "%";
    document.getElementById("enemy-block").innerText = state.enemy.block;

    const stageInfo = document.getElementById("stage-info");
    const scoreInfo = document.getElementById("score-info");
    const enemyNameEl = document.getElementById("enemy-name");
    const coinInfo = document.getElementById("coin-info");
    if (coinInfo) {
        coinInfo.innerText = `COIN: ${state.player.coins}`;
    }

    renderStatus('player-status-box', state.player.status);
    renderStatus('enemy-status-box', state.enemy.status);
    renderArtifacts(state.artifacts);

    const elementIcons = {
        fire: "🔥",
        water: "💧",
        grass: "🌿"
    };

    const icon = elementIcons[state.enemy.element] || "👾";
    enemyNameEl.innerText = `${icon} ${state.enemy.name}`;
    enemyNameEl.className = `sprite element-${state.enemy.element}`;

    if (stageInfo && scoreInfo) {
        // 예: STAGE 1-3 (1사이클 3번째 몹), 보스면 STAGE 1-BOSS
        let subStage = state.progress.killCount + 1;
        if (state.progress.killCount === 3) subStage = "BOSS";
        
        stageInfo.innerText = `STAGE: ${state.progress.cycle}-${subStage}`;
        scoreInfo.innerText = `SCORE: ${state.progress.score}`;
        
        // 보스전일 때 텍스트 색상 강조
        if (subStage === "BOSS") {
            stageInfo.style.color = "#ff0055";
            stageInfo.style.textShadow = "0 0 10px #ff0055";
        } else {
            stageInfo.style.color = "#fff";
            stageInfo.style.textShadow = "none";
        }
    }
}

// [추가] 상태이상 설명 데이터베이스
const STATUS_INFO = {
    strength: {
        name: "힘 (Strength)",
        desc: "공격 카드의 피해량이 수치만큼 증가합니다.\n턴 종료 시 수치가 감소하지 않습니다."
    },
    overheat: {
        name: "과부하 (Overheat)",
        desc: "턴 종료 시, 수치만큼 '힘'이 감소합니다."
    },
    rage: {
        name: "격노 (Traffic Filter)",
        desc: "공격 카드를 사용할 때마다 수치만큼 방어도를 얻습니다.\n턴 종료 시 수치가 전부 감소합니다."
    },
    vulnerable: {
        name: "취약 (Vulnerable)",
        desc: "공격 피해를 입을 때 50%의 추가 피해를 입습니다.\n턴 종료 시 수치가 1 감소합니다."
    },
    weak: {
        name: "약화 (Weak)",
        desc: "공격으로 주는 피해량이 25% 감소합니다.\n턴 종료 시 수치가 1 감소합니다."
    },
    ritual: {
        name: "의식 (Ritual)",
        desc: "턴 시작 시, 수치만큼 '힘'을 얻습니다.\n턴 종료 시 수치가 감소하지 않습니다."
    },
    burn: {
        name: "화상 (Burn)",
        desc: "턴 종료 시 수치만큼 피해를 입고 사라집니다.\n물 속성 적에게 입히면 효과가 사라집니다."
    },
    entangle: {
        name: "속박 (Entangle)",
        desc: "방어도를 얻을 때 수치만큼 덜 얻습니다.\n턴 종료 시 수치가 1 감소합니다."
    },
    wet: {
        name: "젖음 (Wet)",
        desc: "공격 피해를 받을 때 수치만큼 고정 피해가 추가로 들어갑니다.\n턴 종료 시 수치가 1 감소합니다."
    },
    exception_mode: {
        name: "예외 처리 (Exception Handling)",
        desc: "카드의 효과로 체력을 잃을 때마다 수치만큼 힘을 얻습니다."
    }
};

function getKoreanStatusName(id) {
    // STATUS_INFO에 정의된 이름에서 괄호 앞부분만 가져옵니다.
    // 예: "힘 (Strength)" -> "힘"
    if (STATUS_INFO[id]) {
        return STATUS_INFO[id].name.split('(')[0].trim();
    }
    return id; // 정의되지 않은 경우 ID 그대로 출력
}

// 2. 적 행동 의도 표시
export function updateEnemyIntentUI(enemy) {
    const intentEl = document.getElementById("enemy-intent");
    const nextAction = enemy.actions[enemy.patternIndex];

    // 행동이 없거나 대기 중일 때
    if (!nextAction) {
        intentEl.innerText = "⚠️ 행동 예정";
        intentEl.style.color = "#ffffff";
        intentEl.style.borderColor = "#ffffff";
        return;
    }

    switch (nextAction.type) {
        case 'attack':
            intentEl.innerText = `⚔️ 공격 (${nextAction.value} 피해)`;
            intentEl.style.borderColor = "#ff0055"; 
            intentEl.style.color = "#ff0055";
            break;

        case 'defend':
        case 'block':
            intentEl.innerText = `🛡️ 방어 (${nextAction.value})`;
            intentEl.style.borderColor = "#00d0ff";
            intentEl.style.color = "#00d0ff";
            break;

        case 'wait':
            intentEl.innerText = `💤 대기`;
            intentEl.style.borderColor = "#aaaaaa";
            intentEl.style.color = "#aaaaaa";
            break;

        case 'buff':
            // 힘(Strength) 아이콘 매핑
            let buffIcon = "💪"; 
            if (nextAction.status === 'ritual') buffIcon = "🕯️";
            
            // 한글 이름 가져오기
            const buffName = getKoreanStatusName(nextAction.status);
            
            intentEl.innerText = `${buffIcon} ${buffName} (+${nextAction.value})`;
            intentEl.style.borderColor = "#00ff41"; // 초록색
            intentEl.style.color = "#00ff41";
            break;
            
        case 'debuff':
            // 상태별 아이콘
            let debuffIcon = "💀";
            if (nextAction.status === 'vulnerable') debuffIcon = "💔";
            if (nextAction.status === 'weak') debuffIcon = "📉";
            if (nextAction.status === 'burn') debuffIcon = "🔥";
            if (nextAction.status === 'wet') debuffIcon = "💧";
            if (nextAction.status === 'entangle') debuffIcon = "🌿";

            // 한글 이름 가져오기
            const debuffName = getKoreanStatusName(nextAction.status);

            intentEl.innerText = `${debuffIcon} ${debuffName} (+${nextAction.value})`;
            intentEl.style.borderColor = "#b026ff"; // 보라색
            intentEl.style.color = "#b026ff";
            break;

        default:
            intentEl.innerText = `⚠️ 행동 예정`;
            intentEl.style.borderColor = "#ffffff";
            intentEl.style.color = "#ffffff";
    }
}

// 3. 카드 덱/버린카드 숫자 표시
export function updatePileCount(deckCount, discardCount) {
    document.getElementById("deck-count").innerText = deckCount;
    document.getElementById("discard-count").innerText = discardCount;
}

// 4. 손패 렌더링
export function renderHand(hand, playerMana) {
    const handContainer = document.getElementById("hand-container");
    handContainer.innerHTML = "";

    hand.forEach((card, index) => {
        // createCardElement 로직을 여기에 통합
        const cardEl = document.createElement("div");
        let classes = `card ${card.type}`;
        
        // 마나 체크 로직
        if (playerMana >= card.cost) {
            classes += " playable";
            // window.playCard는 game.js에서 등록됨
            cardEl.onclick = () => window.playCard(index); 
        } else {
            classes += " disabled";
            cardEl.onclick = () => { log("시스템 경고: RAM(마나)이 부족합니다."); };
        }

        if (card.element) {
            classes += ` elem-${card.element}`;
        }

        cardEl.className = classes;
        const typeIcon = getCardTypeIcon(card.type);
        const elemIcon = card.element ? getElementIconUI(card.element) : "";

        let descClass = "card-desc";
        const len = card.desc.length;
        if (len > 45) descClass += " tiny-font";      // 45자 넘으면 아주 작게
        else if (len > 25) descClass += " small-font"; // 25자 넘으면 조금 작게

        cardEl.innerHTML = `
            <div class="card-cost">${card.cost}</div>
            <div class="card-type-icon">${typeIcon}</div>
            <div class="card-name">${elemIcon} ${card.name}</div>
            <div class="${descClass}">${card.desc}</div>
        `;
        handContainer.appendChild(cardEl);
    });
}

// 5. 모달 관련 UI
export function renderModalCards(cards, type) {
    const listContainer = document.getElementById("modal-card-list");
    listContainer.innerHTML = ""; // 초기화

    if (cards.length === 0) {
        listContainer.innerHTML = "<p>카드가 없습니다.</p>";
        return;
    }

    cards.forEach(card => {
        // 모달용 카드 생성 (클릭 불가)
        const cardEl = document.createElement("div");
        let classes = `card ${card.type}`;
        if (card.element) {
            classes += ` elem-${card.element}`;
        }
        cardEl.className = classes;
        const typeIcon = getCardTypeIcon(card.type);
        const elemIcon = card.element ? getElementIconUI(card.element) : "";

        let descClass = "card-desc";
        const len = card.desc.length;
        if (len > 45) descClass += " tiny-font";
        else if (len > 25) descClass += " small-font";

        cardEl.innerHTML = `
            <div class="card-cost">${card.cost}</div>
            <div class="card-type-icon">${typeIcon}</div>
            <div class="card-name">${elemIcon} ${card.name}</div>
            <div class="${descClass}">${card.desc}</div>
        `;
        listContainer.appendChild(cardEl);
    });
}

// 상태이상 아이콘 렌더링 함수
function renderStatus(containerId, status) {
    let container = document.getElementById(containerId);
    if (!container) return; // 컨테이너 없으면 패스

    container.innerHTML = '';
    const icons = {
        strength: '💪', vulnerable: '💔', weak: '📉', 
        ritual: '🕯️', burn: '🔥', entangle: '🌿', wet: '💧', overheat: '🔌',
        rage: '🚧', exception_mode: '⚠️'
    };

    for (const [key, value] of Object.entries(status)) {
        if (value > 0) {
            const el = document.createElement('span');
            el.className = 'status-icon';
            el.innerHTML = `${icons[key]}${value} `;
            el.style.marginRight = '5px';
            el.style.fontSize = '0.9em';
            el.style.cursor = 'help';
            el.onmouseenter = (e) => showTooltip(e, key, value);
            el.onmousemove = (e) => moveTooltip(e);
            el.onmouseleave = hideTooltip;
            container.appendChild(el);
        }
    }
}

// [추가] 툴팁 제어 함수들
function showTooltip(e, key, value) {
    const tooltip = document.getElementById("game-tooltip");
    const titleEl = document.getElementById("tooltip-title");
    const descEl = document.getElementById("tooltip-desc");
    
    // 데이터 가져오기 (없으면 기본값)
    const info = STATUS_INFO[key] || { name: key, desc: "알 수 없는 효과" };

    titleEl.innerText = `${info.name} : ${value}`;
    descEl.innerText = info.desc;

    tooltip.classList.remove("hidden");
    moveTooltip(e); // 띄우는 순간 위치 잡기
}

function moveTooltip(e) {
    const tooltip = document.getElementById("game-tooltip");
    // 마우스 커서보다 살짝 오른쪽 아래에 위치
    const x = e.clientX + 15;
    const y = e.clientY + 15;
    
    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
}

function hideTooltip() {
    const tooltip = document.getElementById("game-tooltip");
    tooltip.classList.add("hidden");
}

// [신규] 유물 아이콘 렌더링
function renderArtifacts(artifacts) {
    const container = document.getElementById("artifact-bar");
    if (!container) return;

    container.innerHTML = "";
    
    artifacts.forEach(artifact => {
        const el = document.createElement("div");
        el.className = "artifact-icon";
        el.innerText = artifact.icon || "🎁"
        el.style.fontSize = "1.5em";
        el.style.cursor = "help";
        el.style.border = "1px solid #555";
        el.style.borderRadius = "5px";
        el.style.padding = "5px";
        el.style.background = "#222";
        
        // 툴팁 연결 (기존 툴팁 시스템 재사용)
        // ui.js 하단의 showTooltip 함수가 name, desc를 받도록 되어있어야 함
        // showTooltip(e, key, value) 형태이므로 약간 변형 필요
        // -> 여기서는 showTooltip을 직접 호출하는 대신 커스텀 핸들러 작성
        
        el.onmouseenter = (e) => showArtifactTooltip(e, artifact);
        el.onmousemove = (e) => moveTooltip(e); // 기존 함수 재사용
        el.onmouseleave = hideTooltip; // 기존 함수 재사용

        container.appendChild(el);
    });
}

// [신규] 유물 전용 툴팁 표시
function showArtifactTooltip(e, artifact) {
    const tooltip = document.getElementById("game-tooltip");
    const titleEl = document.getElementById("tooltip-title");
    const descEl = document.getElementById("tooltip-desc");
    
    titleEl.innerText = artifact.name;
    descEl.innerText = artifact.desc;

    tooltip.classList.remove("hidden");
    moveTooltip(e);
}

export function showRewardScreen(earnedCoins, isBoss) {
    const modal = document.getElementById("reward-modal");
    const title = document.getElementById("reward-title");
    const coinText = document.getElementById("reward-coin-text");

    modal.classList.remove("hidden");

    if (isBoss) {
        title.innerText = "BOSS DESTROYED!";
        title.style.color = "#ff0055"; // 보스 처치 시 붉은색 강조
    } else {
        title.innerText = "VICTORY!";
        title.style.color = "#ffd700"; // 일반 승리 금색
    }

    coinText.innerHTML = `💰 획득 코인: <span style="color: #ffd700;">${earnedCoins} G</span>`;
}

export function hideRewardScreen() {
    document.getElementById("reward-modal").classList.add("hidden");
}

function getElementIconUI(element) {
    if (element === 'fire') return '<span style="color:#ff5555">🔥</span>';
    if (element === 'water') return '<span style="color:#55aaff">💧</span>';
    if (element === 'grass') return '<span style="color:#55ff55">🌿</span>';
    return '';
}

function getCardTypeIcon(type) {
    if (type === 'attack') return '⚔️';
    if (type === 'defense') return '🛡️';
    if (type === 'skill') return '⚡';
    if (type === 'power') return '🔥';
    return '❓';
}
