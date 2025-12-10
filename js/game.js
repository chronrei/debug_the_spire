import { CARD_DATABASE } from './card.js';
import { NORMAL_ENEMIES, BOSS_ENEMIES } from './enemy.js';
import { log, shuffleArray, clearLog } from './util.js';
import * as UI from './ui.js';
import * as Status from './status.js';
import { ARTIFACT_DATABASE } from './artifact.js';

// --- 1. 게임 데이터 및 상태 ---
const GAME_STATE = {
    player: { hp: 80, maxHp: 80, mana: 3, maxMana: 3, block: 0, coins: 0, status: { ...Status.INITIAL_STATUS } },
    enemy: null,
    hand: [],
    discardPile: [],
    deck: [],
    progress: {
        cycle: 1,      // 현재 사이클 (1, 2, 3)
        killCount: 0,  // 현재 사이클에서 잡은 일반 몹 수 (0, 1, 2 -> 3은 보스)
        score: 0       // 총 점수
    },
    artifacts: [],
    turnCount: 0
};

// --- 유물 처리 헬퍼 함수 ---
function triggerArtifacts(triggerName) {
    GAME_STATE.artifacts.forEach(artifact => {
        if (artifact.trigger === triggerName) {
            artifact.effect(GAME_STATE); // 효과 발동!
        }
    });
    UI.updateUI(GAME_STATE); // 상태 변화 반영
}

// --- 2. 초기화 함수 ---
function initGame() {
    // 상태 초기화
    GAME_STATE.progress = { cycle: 1, killCount: 0, score: 0 };
    GAME_STATE.player.hp = GAME_STATE.player.maxHp;
    GAME_STATE.player.status = { ...Status.INITIAL_STATUS };
    GAME_STATE.artifacts = [];
    GAME_STATE.player.coins = 0;
    GAME_STATE.removalCost = 75;

    for(let i=0; i<3; i++) {
        addRandomArtifact(); 
    }

    // 덱 생성
    GAME_STATE.deck = [];
    for (let i = 0; i < 5; i++) {
        // 카드를 복사한 뒤 속성을 부여하고 덱에 넣음
        let card = { ...CARD_DATABASE[0] };
        card = assignRandomElement(card); 
        GAME_STATE.deck.push(card);
    }

    // CARD_DATABASE[1] = 방화벽 (방어) -> 4장 (속성 부여 X)
    for (let i = 0; i < 4; i++) {
        GAME_STATE.deck.push({ ...CARD_DATABASE[1] });
    }

    // CARD_DATABASE[2] = 강타/Sudo_Bash (공격) -> 1장
    let specialCard = { ...CARD_DATABASE[2] };
    specialCard = assignRandomElement(specialCard);
    GAME_STATE.deck.push(specialCard);
    
    shuffleArray(GAME_STATE.deck);
    spawnEnemy();
    startTurn();
    triggerArtifacts("onCombatStart");
}

function spawnEnemy() {
    clearLog();
    let enemyData;
    const isBoss = GAME_STATE.progress.killCount === 3;

    // killCount가 3이면 보스 등장
    if (isBoss) {
        // 보스 풀에서 랜덤 선택 (사이클에 따라 고정하고 싶으면 cycle 변수 활용 가능)
        enemyData = BOSS_ENEMIES[Math.floor(Math.random() * BOSS_ENEMIES.length)];
    } else {
        // 일반 몹 등장
        enemyData = NORMAL_ENEMIES[Math.floor(Math.random() * NORMAL_ENEMIES.length)];
    }

    const elements = ['fire', 'water', 'grass'];
    const randomElement = elements[Math.floor(Math.random() * elements.length)];
    
    // 깊은 복사로 가져오기 (원본 훼손 방지)
    GAME_STATE.enemy = {
        ...enemyData,
        maxHp: enemyData.hp,
        block: 0,
        patternIndex: 0, // 패턴 첫 번째부터 시작
        element: randomElement, // 'fire', 'water', 'grass' 중 하나 저장
        status: { ...Status.INITIAL_STATUS }
    };

    const elementStr = randomElement.toUpperCase();

    if (isBoss) {
        // 보스일 때 로그
        log(`🚨 [WARNING] 스테이지 ${GAME_STATE.progress.cycle} 보스: ${enemyData.name} [${elementStr}] 🚨`);
    } else {
        // 일반 몹일 때 로그
        log(`⚠️ 새로운 위협 감지: ${enemyData.name} [${elementStr}]`);
    }
    GAME_STATE.turnCount = 0;

    UI.updateUI(GAME_STATE);
}

// --- 3. 턴 진행 로직 ---
function startTurn() {
    GAME_STATE.turnCount++;
    GAME_STATE.player.mana = GAME_STATE.player.maxMana;
    GAME_STATE.player.block = 0;
    Status.handleTurnStart(GAME_STATE.player);

    UI.updateEnemyIntentUI(GAME_STATE.enemy);
    triggerArtifacts("onTurnStart");
    
    GAME_STATE.hand = [];
    for (let i = 0; i < 5; i++) { 
        if (GAME_STATE.deck.length === 0) {
            if (GAME_STATE.discardPile.length > 0) {
                log("덱이 비어 버린 카드를 섞습니다...");
                GAME_STATE.deck = [...GAME_STATE.discardPile];
                GAME_STATE.discardPile = [];
                shuffleArray(GAME_STATE.deck);
            } else {
                break;
            }
        }
        if (GAME_STATE.deck.length > 0) {
            GAME_STATE.hand.push(GAME_STATE.deck.pop());
        }
    }

    log("=== 플레이어 턴 시작 ===");
    renderAll();
}

function endTurn() {
    const playerBurnDmg = Status.handleTurnEnd(GAME_STATE.player);
    
    if (playerBurnDmg > 0) {
        GAME_STATE.player.hp -= playerBurnDmg;
        log(`🔥 화상으로 인해 ${playerBurnDmg} 피해를 입었습니다.`);
        UI.updateUI(GAME_STATE); // 체력 변화 즉시 반영
    }

    // 화상 데미지로 죽었는지 체크
    if (GAME_STATE.player.hp <= 0) {
        saveGameResult(false);
        alert(`SYSTEM FAILURE... (상태이상 피해로 사망)\n최종 스코어: ${GAME_STATE.progress.score}`);
        location.reload();
        return;
    }

    triggerArtifacts("onTurnEnd");

    const enemy = GAME_STATE.enemy;
    const action = enemy.actions[enemy.patternIndex]; // 현재 행동 데이터 가져오기

    log("⚠️ 적(BUG)의 턴!");
    enemy.block = 0;
    Status.handleTurnStart(enemy);

    if (action.type === 'attack') {
        let rawDamage = action.value;
        // 1. 적의 공격력 계산 (힘, 약화 적용)
        rawDamage = Status.calculateAttackDamage(rawDamage, enemy);

        // 2. 플레이어의 피격 데미지 계산 (취약, 젖음 적용)
        let finalDamage = Status.calculateIncomingDamage(rawDamage, GAME_STATE.player);

        // [핵심] 적 속성에 따른 상태이상 부여 (공격 시)
        if (enemy.element === 'fire') Status.applyStatus(GAME_STATE.player, 'burn', 3);
        if (enemy.element === 'grass') Status.applyStatus(GAME_STATE.player, 'entangle', 2);
        if (enemy.element === 'water') Status.applyStatus(GAME_STATE.player, 'wet', 2);

        // 3. 방어도로 차감
        const damageTaken = Math.max(0, finalDamage - GAME_STATE.player.block);
        GAME_STATE.player.hp -= damageTaken;
        log(`> ${enemy.name} 공격! ${rawDamage} -> 최종 ${finalDamage} (피해: ${damageTaken})`);
    
    } else if (action.type === 'defend') {
        enemy.block += action.value;
        log(`> ${enemy.name}이(가) 방어 태세를 취합니다. (+${action.value})`);
        // *중요: 방어 이펙트나 소리를 여기에 넣을 수 있음
    } else if (action.type === 'wait') {
        log(`> ${action.msg || "대기 중..."}`);
    }

    else if (action.type === 'buff') {
        // 적 자신에게 버프 부여
        Status.applyStatus(enemy, action.status, action.value);
        const msg = action.msg || "버프 시전!";
        log(`> ${enemy.name}: ${msg} (${action.status} +${action.value})`);
    
    } else if (action.type === 'debuff') {
        // 플레이어에게 디버프 부여
        Status.applyStatus(GAME_STATE.player, action.status, action.value);
        const msg = action.msg || "디버프 시전!";
        log(`> ${enemy.name}: ${msg} (${action.status} ${action.value} 부여)`);
    }

    // [추가] 적 턴 종료 효과 처리 (화상 데미지, 버프 감소 등)
    const enemyBurnDmg = Status.handleTurnEnd(enemy);
    if (enemyBurnDmg > 0) GAME_STATE.enemy.hp -= enemyBurnDmg;

    // 다음 패턴으로 이동 (무한 반복)
    enemy.patternIndex = (enemy.patternIndex + 1) % enemy.actions.length;

    if (GAME_STATE.player.hp <= 0) {
        saveGameResult(false);
        alert(`SYSTEM FAILURE...\n최종 스코어: ${GAME_STATE.progress.score}`);
        location.reload();
        return;
    }

    // 적이 화상 데미지로 죽었는지 체크
    if (GAME_STATE.enemy.hp <= 0) {
        handleEnemyDeath();
        return;
    }

    // 손패 버리기
    GAME_STATE.discardPile.push(...GAME_STATE.hand);
    GAME_STATE.hand = [];

    startTurn();
}

// --- 4. 카드 플레이 로직 ---
window.playCard = function(index) {
    const card = GAME_STATE.hand[index];

    if (!card) {
        console.error(`오류: 인덱스 ${index}에 해당하는 카드가 없습니다.`);
        return; // 함수 강제 종료
    }

    // 1. [신규] 카드 사용 조건 확인 (예: 충돌 오류)
    if (card.isPlayable) {
        if (!card.isPlayable(GAME_STATE.hand)) {
            log("사용 조건을 만족하지 못했습니다!");
            return;
        }
    }

    // 2. 마나 확인
    if (GAME_STATE.player.mana < card.cost) {
        log("오류: RAM(마나)이 부족합니다!");
        return;
    }

    // 마나 소모
    GAME_STATE.player.mana -= card.cost;

    // --- [TYPE: ATTACK] 공격 카드 처리 ---
    if (card.type === "attack") {
        triggerArtifacts("onAttack"); // 유물 효과 발동

        if (card.element) {
            let statusType = null;
            if (card.element === 'fire') statusType = 'burn';
            if (card.element === 'water') statusType = 'wet';
            if (card.element === 'grass') statusType = 'entangle';

            if (statusType) {
                // 공격과 동시에 상태이상 1 부여
                // (이미 status.js에 상성 로직이 있으므로, 불 속성 적에게 화상은 면역됨)
                Status.applyStatus(GAME_STATE.enemy, statusType, 1);
                log(`> [속성 발동] ${getElementIcon(card.element)} 카드 -> ${statusType} 1 부여`);
            }
        }

        if (GAME_STATE.player.status.rage > 0) {
            const rageBlock = GAME_STATE.player.status.rage;
            GAME_STATE.player.block += rageBlock;
            log(`🛡️ 트래픽 필터 작동! 방어도 +${rageBlock}`);
        }
        
        // 타격 횟수 (기본 1회, 이중 타격은 2회 등)
        const hits = card.multiHit || 1; 

        for (let i = 0; i < hits; i++) {
            let rawDamage = card.value;

            // A. [신규] 동적 추가 데미지 (예: 완벽한 타격)
            if (card.calcBonus) {
                const bonus = card.calcBonus(GAME_STATE);
                rawDamage += bonus;
                if (i === 0) log(`💡 [${card.name}] 추가 연산 +${bonus}`);
            }

            // B. [신규] 힘(Strength) 적용 및 배율 처리 (예: 하이퍼 스레드)
            let strength = GAME_STATE.player.status.strength;
            if (card.scaleFactor && strength > 0) {
                // 배율이 있으면 힘을 증폭해서 적용 (예: 힘 3 * 배율 3 = 9 추가 데미지)
                strength *= card.scaleFactor;
            }
            rawDamage += strength;

            // C. 약화(Weak) 적용 (플레이어 상태)
            if (GAME_STATE.player.status.weak > 0) {
                rawDamage = Math.floor(rawDamage * 0.75);
            }

            // D. 적 취약(Vulnerable) 및 방어 상태 계산
            // (calculateIncomingDamage 함수가 취약 1.5배 등을 처리함)
            let finalDamage = Status.calculateIncomingDamage(rawDamage, GAME_STATE.enemy);

            // 점수 집계
            GAME_STATE.progress.score += finalDamage;

            // E. 실제 HP/방어도 차감 로직
            let damageToHp = finalDamage;
            
            if (GAME_STATE.enemy.block > 0) {
                if (GAME_STATE.enemy.block >= damageToHp) {
                    GAME_STATE.enemy.block -= damageToHp;
                    damageToHp = 0;
                    log(`> [${card.name}] 방어됨 (${GAME_STATE.enemy.block} 남음)`);
                } else {
                    damageToHp -= GAME_STATE.enemy.block;
                    GAME_STATE.enemy.block = 0;
                    log(`> [${card.name}] 방어도 파괴!`);
                }
            }

            // 체력 차감
            GAME_STATE.enemy.hp -= damageToHp;
            if (damageToHp > 0) {
                log(`> [${card.name}] 적중! ${hits > 1 ? `(${i+1}타)` : ""} 피해: ${damageToHp}`);
            }

            // F. [신규] 젖음(Wet) 효과 발동 (피격 시 추가 고정 피해)
            // (방어도를 뚫고 들어갔거나, 젖음은 방어도를 무시하는 고정 피해로 설정할 수도 있음. 
            //  보통은 피격 이벤트 시 발동하므로 데미지가 0이어도 발동하거나, 유효타일때만 발동.
            //  여기서는 '공격을 받았을 때' 무조건 발동으로 처리)
            if (GAME_STATE.enemy.status && GAME_STATE.enemy.status.wet > 0) {
                const wetDmg = GAME_STATE.enemy.status.wet;
                GAME_STATE.enemy.hp -= wetDmg;
                log(`💧 젖음 효과! 추가 피해 ${wetDmg}`);
            }

            // G. 적 처치 체크 (연타 도중이라도 죽으면 중단)
            if (GAME_STATE.enemy.hp <= 0) {
                handleEnemyDeath(); 
                return; // 함수 종료
            }
        }
    } 
    // --- [TYPE: DEFENSE] 방어 카드 처리 ---
    else if (card.type === 'defense') {
        triggerArtifacts("onDefend"); // 유물 효과 발동

        // 방어도 계산 (속박 등 적용)
        let blockGain = Status.calculateBlockGain(card.value, GAME_STATE.player);
        
        GAME_STATE.player.block += blockGain;
        log(`> [${card.name}] 방어 프로세스 가동 (+${blockGain})`);
    }
    // --- [TYPE: SKILL] 스킬 카드 처리 ---
    else if (card.type === 'skill') {
        log(`> [${card.name}] 스킬 시전`);
    }

    // 3. [공통] 카드 특수 효과 실행 (취약 부여, 힘 증가 등)
    // 공격 카드여도 효과(Effect)가 있을 수 있음 (예: Sudo 강타의 취약 부여)
    if (card.effect) {
        card.effect(GAME_STATE);
    }

    // 4. 카드 버리기 및 UI 업데이트
    GAME_STATE.hand.splice(index, 1);
    GAME_STATE.discardPile.push(card);

    renderAll()
}

// [추가] 적 처치 및 게임 클리어 로직
function handleEnemyDeath() {
    const isBoss = GAME_STATE.enemy.isBoss; // 보스 여부 확인
    const enemyMaxHp = GAME_STATE.enemy.maxHp;
    triggerArtifacts("onVictory");

    let earnedCoins = 0;

    if (isBoss) {
        // 보스 처치 시
        GAME_STATE.progress.score += 1000; // 보너스 점수
        log(`🎉 보스 처치! 보너스 +1000점!`);

        earnedCoins = enemyMaxHp * 2;
        
        // 사이클 증가
        GAME_STATE.progress.cycle++;
        GAME_STATE.progress.killCount = 0; // 킬 카운트 초기화

        GAME_STATE.player.hp = GAME_STATE.player.maxHp;

        // 게임 클리어 체크 (3사이클 완료 시)
        if (GAME_STATE.progress.cycle > 3) {
            saveGameResult(true);
            alert(`🎉 MISSION COMPLETE! 🎉\n\n최종 스코어: ${GAME_STATE.progress.score}점\n축하합니다!`);
            location.reload();
            return;
        }

        addRandomArtifact(); 
        log("🎁 보스 보상: 새로운 유물을 획득했습니다!");
    } else {
        // 일반 몹 처치 시
        GAME_STATE.progress.killCount++;
        earnedCoins = enemyMaxHp;
        log(`바이러스 제거 완료. (현재 진행: ${GAME_STATE.progress.killCount}/3)`);
    }

    const variance = Math.floor(earnedCoins * 0.1);
    earnedCoins += Math.floor(Math.random() * (variance * 2 + 1)) - variance;

    GAME_STATE.player.coins += earnedCoins;

    UI.updateUI(GAME_STATE); // 코인 UI 반영
    UI.showRewardScreen(earnedCoins, isBoss);
}

function addRandomArtifact() {
    // 이미 가진 유물 제외하고 랜덤 선택
    const ownedIds = GAME_STATE.artifacts.map(a => a.id);
    const available = ARTIFACT_DATABASE.filter(a => !ownedIds.includes(a.id));
    
    if (available.length > 0) {
        const newArtifact = available[Math.floor(Math.random() * available.length)];
        GAME_STATE.artifacts.push(newArtifact);
        
        // 'onObtain' 타입은 획득 즉시 발동 (예: 최대체력 증가)
        if (newArtifact.trigger === "onObtain") {
            newArtifact.effect(GAME_STATE);
        }
    }
}

// [신규] 공격 카드에 랜덤 속성 부여 함수
function assignRandomElement(card) {
    // 공격 카드가 아니면 속성 없음
    if (card.type !== 'attack') return card;

    const elements = ['fire', 'water', 'grass'];
    const randomElement = elements[Math.floor(Math.random() * elements.length)];
    
    // 원본 데이터를 건드리지 않기 위해 복사본 생성 후 수정
    const newCard = { ...card };
    newCard.element = randomElement;
    
    // 설명에 속성 표시 추가 (선택사항)
    // newCard.desc = `[${getElementIcon(randomElement)}] ` + newCard.desc;
    
    return newCard;
}

// 아이콘 헬퍼
function getElementIcon(element) {
    if (element === 'fire') return '🔥';
    if (element === 'water') return '💧';
    if (element === 'grass') return '🌿';
    return '';
}

// --- 5. 렌더링 헬퍼 ---
// 게임 상태가 변할 때마다 호출해서 화면을 동기화
function renderAll() {
    UI.updateUI(GAME_STATE);
    UI.renderHand(GAME_STATE.hand, GAME_STATE.player.mana);
    UI.updatePileCount(GAME_STATE.deck.length, GAME_STATE.discardPile.length);
}

// --- 6. 모달(팝업) 관련 로직 ---
window.openModal = function(type) {
    const modal = document.getElementById("card-modal");
    const title = document.getElementById("modal-title");

    modal.classList.remove("hidden");
    let cardsToShow = [];

    if (type === 'deck') {
        title.innerText = "DRAW PILE (드로우 덱)";
        // 덱은 순서를 들키면 안되므로, 보여줄 때는 이름순/ID순으로 정렬해서 보여줌
        cardsToShow = [...GAME_STATE.deck].sort((a, b) => a.id - b.id);
    } else {
        title.innerText = "DISCARD PILE (버린 카드)";
        // 버린 카드는 순서대로 보여줘도 상관없음 (원하면 역순으로 보여줘서 최근 버린게 위로 오게 가능)
        cardsToShow = [...GAME_STATE.discardPile].reverse(); 
    }
    
    UI.renderModalCards(cardsToShow, type);
}

window.closeModal = function() {
    document.getElementById("card-modal").classList.add("hidden");
}

window.startNextBattle = function() {
    // 1. 모달 닫기
    document.getElementById("card-reward-modal").classList.add("hidden");

    if (GAME_STATE.progress.killCount === 3) {
        log("🏕️ 보스 진입 전, 안전 지대를 발견했습니다.");
        enterRestSite(); // 쉼터 진입
        return; // 여기서 함수 종료 (보스 소환은 쉼터 나갈 때 함)
    }

    // 2. 플레이어 상태 리셋 (이전 handleEnemyDeath에 있던 로직 이동)
    GAME_STATE.player.status = { ...Status.INITIAL_STATUS };
    GAME_STATE.player.block = 0;
    GAME_STATE.player.mana = GAME_STATE.player.maxMana;

    // 3. 덱 리셋 (Shuffle)
    GAME_STATE.deck.push(...GAME_STATE.hand);
    GAME_STATE.deck.push(...GAME_STATE.discardPile);
    GAME_STATE.hand = [];
    GAME_STATE.discardPile = [];
    shuffleArray(GAME_STATE.deck);

    // 4. 다음 적 소환 및 턴 시작
    spawnEnemy();
    startTurn();

    triggerArtifacts("onCombatStart");
}

window.endTurn = endTurn;

// 배경 클릭 시 닫기
document.getElementById("card-modal").onclick = function(event) {
    if (event.target === this) window.closeModal();
}

// 게임 시작
window.startGameFlow = function() {
    const lobby = document.getElementById("lobby-screen");
    const gameContainer = document.querySelector(".game-container");

    // 로비 숨기기
    lobby.style.display = "none";
    
    // 게임 화면 보이기
    gameContainer.classList.remove("hidden");
    
    // 게임 초기화 및 시작
    initGame();

    setTimeout(checkFirstTimeUser, 500);
}

window.toggleGameGuide = function() {
    const modal = document.getElementById('game-guide-modal');
    
    // 닫혀있으면 -> 연다
    if (modal.classList.contains('hidden')) {
        modal.classList.remove('hidden');
    } else {
        // 열려있으면 -> 닫기 로직 호출
        closeGameGuideLogic();
    }
};

window.closeGameGuideLogic = function() {
    // 1. 일단 가이드 창은 무조건 닫습니다.
    document.getElementById('game-guide-modal').classList.add('hidden');

    // 2. 첫 닫기인지 확인
    window.isFirstTimeSequence = false;

    const hasSeenHint = localStorage.getItem('dts_guide_location_seen');

    if (!hasSeenHint) {
        // 3. 처음이라면 -> 가이드가 꺼진 뒤 힌트 창을 띄웁니다.
        const hintModal = document.getElementById('guide-location-hint');
        hintModal.classList.remove('hidden');
    }
};

window.confirmGuideHint = function() {
    // 1. 힌트 창 닫기
    document.getElementById('guide-location-hint').classList.add('hidden');
    
    // 2. "봤음" 처리 저장 (다음부터는 힌트가 안 뜸)
    localStorage.setItem('dts_guide_location_seen', 'true');
};

// [신규] 게임 결과 저장 함수 (로컬스토리지)
function saveGameResult(isClear) {
    // 1. 기존 기록 가져오기 (없으면 빈 배열)
    const savedData = localStorage.getItem('dts_records');
    let records = savedData ? JSON.parse(savedData) : [];

    // 2. 현재 기록 객체 생성
    const currentCycle = GAME_STATE.progress.cycle;
    const currentKill = GAME_STATE.progress.killCount;
    
    // 스테이지 표기 (예: 1-BOSS, 2-3)
    let stageStr = "";
    if (isClear) {
        stageStr = "ALL CLEAR";
    } else {
        const subStage = (currentKill === 3) ? "BOSS" : (currentKill + 1);
        stageStr = `${currentCycle}-${subStage}`;
    }

    const newRecord = {
        score: GAME_STATE.progress.score,
        stage: stageStr,
        date: new Date().toLocaleDateString() // 날짜 저장
    };

    // 3. 배열에 추가하고 점수 내림차순 정렬
    records.push(newRecord);
    records.sort((a, b) => b.score - a.score);

    // 4. 상위 10개만 남기기
    if (records.length > 10) {
        records = records.slice(0, 10);
    }

    // 5. 저장
    localStorage.setItem('dts_records', JSON.stringify(records));
}

// [신규] 기록 모달 열기 (로비 버튼 연결)
window.openRecordModal = function() {
    const modal = document.getElementById('record-modal');
    const tbody = document.getElementById('record-tbody');
    
    // 데이터 로드
    const savedData = localStorage.getItem('dts_records');
    const records = savedData ? JSON.parse(savedData) : [];

    // 테이블 초기화
    tbody.innerHTML = "";

    if (records.length === 0) {
        tbody.innerHTML = "<tr><td colspan='4'>데이터가 없습니다.</td></tr>";
    } else {
        records.forEach((rec, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${index + 1}</td>
                <td>${rec.score}</td>
                <td>${rec.stage}</td>
                <td>${rec.date}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    modal.classList.remove('hidden');
};

// [신규] 기록 모달 닫기
window.closeRecordModal = function() {
    document.getElementById('record-modal').classList.add('hidden');
};

// [신규] 카드 보상 화면 열기 (코인 보상 확인 후 호출됨)
window.openCardReward = function() {
    // 1. 코인 보상창 닫기
    UI.hideRewardScreen();

    // 2. 보상 카드 풀 생성 (초기 카드 3종 제외)
    // 제외할 ID: strike(코드 타격), defend(방화벽), sudo_bash(강타)
    const initialCardIds = ["strike", "defend", "sudo_bash"];
    
    // 전체 카드 중 초기 카드를 제외한 목록 필터링
    const rewardPool = CARD_DATABASE.filter(card => !initialCardIds.includes(card.id));

    // 3. 랜덤으로 3장 뽑기
    shuffleArray(rewardPool); // 풀 섞기
    const rawSelected = rewardPool.slice(0, 3); // 앞에서 3장 가져오기
    const selectedCards = rawSelected.map(card => assignRandomElement(card));


    // 4. UI에 그리기 (game.js에서 직접 DOM 조작하거나 ui.js에 위임)
    const container = document.getElementById("reward-card-list");
    container.innerHTML = ""; // 초기화

    selectedCards.forEach(card => {
        // 카드 요소 생성
        const cardEl = document.createElement("div");
        cardEl.className = "reward-card";
        cardEl.onclick = () => selectRewardCard(card); // 클릭 시 선택 함수 호출
        let typeIcon = '❓';
        let typeText = '특수';
        
        if (card.type === 'attack') { typeIcon = '⚔️'; typeText = '공격'; }
        else if (card.type === 'defense') { typeIcon = '🛡️'; typeText = '방어'; }
        else if (card.type === 'skill') { typeIcon = '⚡'; typeText = '스킬'; }
        else if (card.type === 'power') { typeIcon = '🔥'; typeText = '파워'; } // 파워 정상 인식

        const elemIcon = card.element ? getElementIconUI(card.element) : "";

        let descClass = "card-desc";
        const len = card.desc.length;
        if (len > 45) descClass += " tiny-font";
        else if (len > 25) descClass += " small-font";

        // 카드 내용 채우기
        cardEl.innerHTML = `
            <div class="card-cost">${card.cost}</div>
            
            <h3>${elemIcon} ${card.name}</h3>
            
            <div class="card-type" style="color:#888; font-size: 0.9em; margin-bottom: 5px;">
                ${typeIcon} ${typeText}
            </div>

            <p class="${descClass}">${card.desc}</p>
        `;
        
        container.appendChild(cardEl);
    });

    // 5. 모달 열기
    document.getElementById("card-reward-modal").classList.remove("hidden");
};

// [신규] 보상 카드 선택 시 실행
window.selectRewardCard = function(card) {
    // 덱에 선택한 카드 복사본 추가 (객체 참조 문제 방지를 위해 복사)
    const newCard = { ...card };
    GAME_STATE.deck.push(newCard);
    
    log(`🎁 카드 획득: [${newCard.name}]`);
    log(`[${newCard.name}] 카드를 획득했습니다!`);

    // 다음 스테이지로 진짜 이동
    startNextBattle();
};

// [신규] 카드 선택 스킵
window.skipCardReward = function() {
    log("보상 카드를 선택하지 않았습니다.");
    startNextBattle(); // 그냥 이동
};

// [신규] 카드로 인한 체력 감소 처리 (자해)
window.applySelfDamage = function(amount) {
    // 1. 체력 감소
    GAME_STATE.player.hp -= amount;
    
    // 2. [예외 처리] 효과 발동 체크
    // 플레이어에게 'exception_mode' 버프가 있으면 힘 증가
    if (GAME_STATE.player.status.exception_mode > 0) {
        const bonusStr = GAME_STATE.player.status.exception_mode; // 보통 1
        Status.applyStatus(GAME_STATE.player, 'strength', bonusStr);
        log(`⚠️ [예외 처리] 체력 손실 감지! 힘 +${bonusStr} 증가`);
    }

    // 3. UI 업데이트는 호출한 곳이나 playCard 마지막에서 처리됨
    UI.updateUI(GAME_STATE);
};

window.enterRestSite = function() {
    GAME_STATE.deck.push(...GAME_STATE.hand);
    GAME_STATE.deck.push(...GAME_STATE.discardPile);
    GAME_STATE.hand = [];
    GAME_STATE.discardPile = [];

    const modal = document.getElementById("rest-site-modal");
    modal.classList.remove("hidden");
    
    updateRestUI();
};

// 쉼터 UI 업데이트
function updateRestUI() {
    const p = GAME_STATE.player;
    
    // 1. 상태 표시
    document.getElementById("rest-hp-val").innerText = p.hp;
    document.getElementById("rest-max-hp-val").innerText = p.maxHp;
    document.getElementById("rest-coin-val").innerText = p.coins;

    // 2. 회복량 계산 (잃은 체력의 30%)
    const lostHp = p.maxHp - p.hp;
    const healAmount = Math.floor(lostHp * 0.3);
    document.getElementById("heal-amount-text").innerText = `회복량: +${healAmount}`;

    // 3. 제거 비용 표시
    document.getElementById("remove-cost-text").innerText = `비용: ${GAME_STATE.removalCost} G`;

    // 4. 버튼 활성화 상태 관리
    // 만약 이미 카드 제거를 한 번이라도 했다면, 휴식 버튼 비활성화 (선택 불가)
    // 하지만 "휴식을 했다면 제거 불가"는 chooseRestHeal에서 즉시 나가므로 처리 필요 없음
    const restBtn = document.getElementById("btn-rest-heal");
    if (document.getElementById("rest-deck-view").classList.contains("active-mode")) {
        restBtn.classList.add("disabled"); // 제거 모드 진입 시 휴식 불가
    }
}

// [선택 1] 휴식 (체력 회복)
window.chooseRestHeal = function() {
    // 제거 모드가 활성화되어 있다면(이미 제거를 선택했으면) 휴식 불가
    if (document.getElementById("rest-deck-view").classList.contains("active-mode")) return;

    const p = GAME_STATE.player;
    const lostHp = p.maxHp - p.hp;
    const healAmount = Math.floor(lostHp * 0.3);

    if (healAmount <= 0) {
        alert("시스템이 이미 최적화 상태(풀피)입니다.");
        return;
    }

    p.hp += healAmount;
    if (p.hp > p.maxHp) p.hp = p.maxHp;

    log(`💤 [시스템 복원] 체력 ${healAmount} 회복 완료.`);
    alert(`체력을 ${healAmount} 회복했습니다.`);
    
    leaveRestSite(); // 휴식은 1회성이므로 바로 나감
};

// [선택 2] 카드 제거 모드 진입
window.chooseRestRemove = function() {
    // 1. 화면 전환 (옵션 숨기고 덱 리스트 보이기)
    document.querySelector(".rest-options").classList.add("hidden"); // ▼ 버튼 숨김 추가
    document.getElementById("rest-deck-view").classList.remove("hidden");
    document.getElementById("rest-deck-view").classList.add("active-mode"); // 제거 모드 활성 플래그
    
    // 휴식 버튼 비활성화 스타일 적용
    document.getElementById("btn-rest-heal").classList.add("disabled");

    renderRestDeck();
};

// 제거용 덱 렌더링
function renderRestDeck() {
    const container = document.getElementById("rest-card-list");
    container.innerHTML = "";

    // 1. [정렬 준비] 원본 인덱스를 기억하며 객체로 변환
    const deckWithIndices = GAME_STATE.deck.map((card, index) => ({ card, originalIndex: index }));

    // 2. [정렬 로직] 종류(공격>스킬>파워) 우선, 그 다음 이름순
    deckWithIndices.sort((a, b) => {
        const typeOrder = { attack: 1, skill: 2, power: 3 };
        const orderA = typeOrder[a.card.type] || 4; // 기타 등등은 뒤로
        const orderB = typeOrder[b.card.type] || 4;

        if (orderA !== orderB) {
            return orderA - orderB; // 종류별 정렬
        }
        return a.card.name.localeCompare(b.card.name); // 같은 종류면 이름순
    });
    
    // 3. [렌더링]
    deckWithIndices.forEach(item => {
        const card = item.card;
        const index = item.originalIndex; // 삭제 시 사용할 진짜 인덱스

        const cardEl = document.createElement("div");
        
        // 스타일 클래스
        let classes = `card ${card.type}`;
        if (card.element) classes += ` elem-${card.element}`;
        cardEl.className = classes;
        
        // 아이콘 처리 (속성 아이콘)
        // (getElementIconUI 함수가 game.js에 있다고 가정)
        const elemIcon = card.element ? getElementIconUI(card.element) : "";
        
        // 타입 아이콘 (없으면 기본값)
        let typeIcon = '❓';
        if (card.type === 'attack') typeIcon = '⚔️';
        else if (card.type === 'defense') typeIcon = '🛡️';
        else if (card.type === 'skill') typeIcon = '⚡';
        else if (card.type === 'power') typeIcon = '🔥';

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
        
        // 클릭 시 원본 인덱스(index)를 사용하여 제거 시도
        cardEl.onclick = () => tryRemoveCard(index);
        
        container.appendChild(cardEl);
    });
}

// 실제 카드 제거 로직
function tryRemoveCard(index) {
    const cost = GAME_STATE.removalCost;
    
    if (GAME_STATE.player.coins < cost) {
        alert("코인이 부족합니다!");
        return;
    }

    if (confirm(`정말 이 카드를 제거하시겠습니까?\n(비용: ${cost} G)`)) {
        // 1. 비용 지불
        GAME_STATE.player.coins -= cost;
        
        // 2. 카드 제거
        const removedCard = GAME_STATE.deck.splice(index, 1)[0];
        
        // 3. 비용 증가 (영구적)
        GAME_STATE.removalCost += 25;
        
        log(`🗑️ [디스크 정리] ${removedCard.name} 제거 완료.`);
        
        // 4. UI 갱신
        updateRestUI();
        renderRestDeck(); // 덱 리스트 다시 그리기
    }
}

// 쉼터 떠나기 (보스전 시작)
window.leaveRestSite = function() {
    document.getElementById("rest-site-modal").classList.add("hidden");
    document.getElementById("rest-deck-view").classList.remove("active-mode"); // 상태 초기화
    document.getElementById("rest-deck-view").classList.add("hidden");
    document.getElementById("btn-rest-heal").classList.remove("disabled");
    document.querySelector(".rest-options").classList.remove("hidden");

    log("⚔️ WARNING: BOSS ENCOUNTER IMMINENT!");

    // 2. [신규] 보스전 대비 플레이어 상태 리셋
    GAME_STATE.player.block = 0;
    GAME_STATE.player.mana = GAME_STATE.player.maxMana;
    // 상태이상(버프/디버프) 초기화 (이전 전투의 영향 제거)
    GAME_STATE.player.status = { ...Status.INITIAL_STATUS };

    // 3. [신규] 덱 셔플 (진입할 때 모아뒀던 카드들을 섞음)
    shuffleArray(GAME_STATE.deck);
    
    // 보스전 시작
    spawnEnemy(); // 이때 killCount가 3이므로 보스 데이터가 로드됨
    startTurn();
    triggerArtifacts("onCombatStart");
    UI.updateUI(GAME_STATE);
};

function getElementIconUI(element) {
    if (element === 'fire') return '<span style="color:#ff5555">🔥</span>';
    if (element === 'water') return '<span style="color:#55aaff">💧</span>';
    if (element === 'grass') return '<span style="color:#55ff55">🌿</span>';
    return '';
}

// [신규] 튜토리얼 열기
window.openTutorial = function() {
    document.getElementById("ui-tutorial-overlay").classList.remove("hidden");
    document.getElementById("game-guide-modal").classList.add("hidden");
};

// [신규] 튜토리얼 닫기
window.closeTutorial = function() {
    document.getElementById("ui-tutorial-overlay").classList.add("hidden");

    if (window.isFirstTimeSequence) {

        setTimeout(() => {
            // 가이드 모달 열기 (기존 함수 활용)
            const guideModal = document.getElementById('game-guide-modal');
            guideModal.classList.remove('hidden');
        }, 200); // 자연스러운 전환을 위한 0.2초 딜레이
    }
};

// [변수] 첫 방문 시퀀스인지 확인하는 플래그
window.isFirstTimeSequence = false;

// [신규] 첫 방문자 체크 및 튜토리얼 자동 실행 함수
window.checkFirstTimeUser = function() {
    const hasVisited = localStorage.getItem('dts_visited');

    if (!hasVisited) {
        console.log("👋 신규 유저 감지: 튜토리얼 시퀀스를 시작합니다.");
        
        // 방문 기록 저장
        localStorage.setItem('dts_visited', 'true');
        
        // 시퀀스 플래그 활성화 (이게 켜져 있어야 튜토리얼 닫을 때 가이드가 열림)
        window.isFirstTimeSequence = true;

        // 튜토리얼 열기
        openTutorial();
    } else {
        console.log("기존 유저 감지: 바로 시작합니다.");
    }
};