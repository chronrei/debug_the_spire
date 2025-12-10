import { log } from './util.js';
import * as Status from './status.js';

// 카드 데이터베이스
export const CARD_DATABASE = [
    { 
        id: "strike", 
        name: "코드타격", 
        type: "attack", 
        cost: 1, 
        value: 6, 
        desc: "피해를 6 줍니다." 
    },

    { 
        id: "defend", 
        name: "방화벽", 
        type: "defense", 
        cost: 1, 
        value: 5, 
        desc: "방어도를 5 얻습니다." 
    },

    {
        id: "sudo_bash",
        name: "강타", // 관리자 권한으로 강타
        type: "attack",
        cost: 2,
        value: 8,
        desc: "피해를 8 줍니다. 적에게 취약을 2 부여합니다.",
        effect: (state) => {
            // 데미지는 기본 로직에서 처리됨
            // 취약 부여 로직만 추가
            Status.applyStatus(state.enemy, 'vulnerable', 2);
        }
    },

    { 
        id: "hotfix", 
        name: "핫픽스", // (구 오버클럭: 이름 중복 방지 변경)
        type: "attack", 
        cost: 0, 
        value: 4, 
        desc: "피해를 4 줍니다." 
    },

    // [신규] 격돌(Clash) -> 충돌 오류 4번
    {
        id: "conflict_error",
        name: "충돌오류", 
        type: "attack",
        cost: 0,
        value: 14,
        desc: "손에 있는 카드가 전부 공격카드일 때만 사용할 수 있습니다. 피해를 14 줍니다.",
        isPlayable: (hand) => {
            // 손패가 모두 공격 타입인지 확인
            return hand.every(card => card.type === 'attack');
        }
    },

    // [신규] 대검(Heavy Blade) -> 하이퍼 스레드
    {
        id: "hyper_thread",
        name: "하이퍼스레드",
        type: "attack",
        cost: 2,
        value: 14,
        desc: "피해를 14 줍니다. 힘의 효과가 3배로 적용됩니다.",
        // 힘 배율 처리는 game.js에서 처리하거나, 여기서 계산
        scaleFactor: 3 // 힘 계수 (기본 1, 이 카드는 3)
    },

    // [신규] 몸풀기(Flex) -> 오버클럭
    {
        id: "overclock",
        name: "오버클럭",
        type: "skill",
        cost: 0,
        value: 0,
        desc: "힘을 2 얻습니다. 이번 턴이 끝날 때 힘을 2 잃습니다.",
        effect: (state) => {
            Status.applyStatus(state.player, 'strength', 2);
            // 턴 종료 시 힘을 잃게 하는 '과부하' 상태 부여 (status.js 수정 필요)
            Status.applyStatus(state.player, 'overheat', 2); 
        }
    },

    // [신규] 이중 타격(Twin Strike)
    {
        id: "twin_strike",
        name: "이중타격",
        type: "attack",
        cost: 1,
        value: 5,
        desc: "피해를 5 만큼 2 번 줍니다.",
        multiHit: 2 // 2회 타격 속성 추가
    },

    // [신규] 부메랑 칼날(Sword Boomerang) -> 핑 루프
    {
        id: "ping_loop",
        name: "핑루프",
        type: "attack",
        cost: 1,
        value: 3,
        desc: "피해를 3 만큼 3 번 줍니다.", // 적이 1명이라 랜덤 타겟 로직 생략
        multiHit: 3 // 3회 타격
    },

    // [신규] 완벽한 타격(Perfected Strike) 9번
    {
        id: "perfected_strike",
        name: "완벽한타격",
        type: "attack",
        cost: 2,
        value: 6,
        desc: "피해를 6 줍니다. 보유 중인 카드 중 이름에 '타격'이 포함된 카드 하나당 피해량이 2 증가합니다.",
        // 동적 데미지 계산 함수
        calcBonus: (state) => {
            const allCards = [...state.deck, ...state.hand, ...state.discardPile];
            // 이름에 '타격' 또는 'Strike'가 들어간 카드 수
            const count = allCards.filter(c => c.name.includes("타격") || c.name.includes("Strike")).length;
            return count * 2;
        }
    },

    {
        id: "active_defense",
        name: "능동방어",
        type: "attack",
        cost: 1,
        value: 5,
        desc: "방어도를 5 얻습니다. 피해를 5 줍니다.",
        effect: (state) => {
            // 방어도는 여기서 직접 부여 (공격 데미지는 기본 로직이 처리)
            let blockGain = Status.calculateBlockGain(5, state.player);
            state.player.block += blockGain;
            log(`🛡️ [능동 방어] 추가 방어도 +${blockGain}`);
        }
    },

    // [신규] 클로스라인(Clothesline) -> 스로틀링
    {
        id: "throttling",
        name: "스로틀링",
        type: "attack",
        cost: 2,
        value: 12,
        desc: "피해를 12 줍니다. 약화를 2 부여합니다.",
        effect: (state) => {
            Status.applyStatus(state.enemy, 'weak', 2);
        }
    },

    // [신규] 격노(Rage) -> 트래픽 필터
    {
        id: "traffic_filter",
        name: "트래픽필터",
        type: "skill",
        cost: 0,
        value: 0,
        desc: "이번 턴에 공격 카드를 사용할 때마다 방어도를 3 얻습니다.",
        effect: (state) => {
            // 'rage' 상태이상 부여 (status.js 수정 필요)
            Status.applyStatus(state.player, 'rage', 3);
        }
    },

    // [신규] 드롭킥(Dropkick) -> 취약점 공격 (드로우 제거됨)
    {
        id: "exploit",
        name: "취약점공격",
        type: "attack",
        cost: 1,
        value: 5,
        desc: "피해를 5 줍니다. 적이 취약 상태라면 마나를 1 얻습니다.",
        effect: (state) => {
            if (state.enemy.status.vulnerable > 0) {
                state.player.mana += 1;
                log(`⚡ [취약점 공격] 리소스 회수! (마나 +1)`);
            }
        }
    },

    {
        id: "overvoltage",
        name: "과전압",
        type: "skill",
        cost: 0,
        value: 0,
        desc: "체력을 3 잃습니다. 마나를 2 얻습니다.",
        effect: (state) => {
            applySelfDamage(3);
            state.player.mana += 2;
            
            log(`⚡ [과전압] 체력 -3 소모, 마나 +2 획득`);
        }
    },

    // [신규] 어퍼컷(Uppercut) -> 강제 재부팅
    {
        id: "force_reboot",
        name: "강제재부팅",
        type: "attack",
        cost: 2,
        value: 13,
        desc: "피해를 13 줍니다. 약화를 1 부여합니다. 취약을 1 부여합니다.",
        effect: (state) => {
            Status.applyStatus(state.enemy, 'weak', 1);
            Status.applyStatus(state.enemy, 'vulnerable', 1);
        }
    },

    {
        id: "brute_force",
        name: "무차별타격", // 이름 변경
        type: "attack",
        cost: 1,
        value: 2,
        desc: "피해를 2 만큼 4 번 줍니다.",
        multiHit: 4 // 4회 타격
    },

    {
        id: "double_encryption",
        name: "이중암호화",
        type: "skill",
        cost: 2, // 기본 2코스트
        value: 0,
        desc: "방어도를 2 배로 만듭니다.",
        effect: (state) => {
            if (state.player.block > 0) {
                state.player.block *= 2;
                log(`🔒 [이중 암호화] 방어도 2배 증폭! (현재: ${state.player.block})`);
            } else {
                log(`🔒 [이중 암호화] 증폭할 방어도가 없습니다.`);
            }
        }
    },

    // [신규] 혈류(Hemokinesis) -> 불안정 컴파일
    {
        id: "unsafe_compile",
        name: "불안정컴파일",
        type: "attack",
        cost: 1,
        value: 15,
        desc: "체력을 2 잃습니다. 피해를 15 줍니다.",
        effect: (state) => {
            applySelfDamage(2);
            log(`⚠️ [불안정 컴파일] 체력 2 소모`);
        }
    },

    // [신규] 몽둥이질(Bludgeon) -> 하드 리셋
    {
        id: "hard_reset",
        name: "하드리셋",
        type: "attack",
        cost: 3,
        value: 32,
        desc: "피해를 32 줍니다.",
        // 특수 효과 없는 깡딜 카드
    },

    // [신규] 화염 장벽(Flame Barrier) -> 시스템 잠금 (반사뎀 삭제됨)
    {
        id: "system_lock",
        name: "시스템잠금",
        type: "defense",
        cost: 2,
        value: 15,
        desc: "방어도를 15 얻습니다.",
    },

    // [신규] 몸통 박치기(Body Slam) -> 버퍼 덤프
    {
        id: "buffer_dump",
        name: "버퍼덤프",
        type: "attack",
        cost: 1,
        value: 0, // 기본 데미지는 0
        desc: "현재 방어도만큼 피해를 줍니다.",
        // 현재 방어도만큼 데미지 추가
        calcBonus: (state) => {
            return state.player.block;
        }
    },

    // [신규] 파열(Rupture) -> 예외 처리
    {
        id: "exception_handling",
        name: "예외처리",
        type: "power", // 파워 타입 (전투 내내 지속)
        cost: 1,
        value: 0,
        desc: "카드의 효과로 체력을 잃을 때마다 힘을 1 얻습니다.",
        effect: (state) => {
            // 'exception_mode' 상태 부여 (수치만큼 힘 증가)
            Status.applyStatus(state.player, 'exception_mode', 1);
        }
    }
];