import { log } from './util.js';
import * as Status from './status.js';

export const ARTIFACT_DATABASE = [
    // --- [스타터] ---
    {
        id: "usb_stick",
        name: "부팅 USB",
        icon: "💾", // 플로피 디스크 (저장/부팅)
        desc: "전투 시작 시: 방어도 6을 얻습니다.",
        trigger: "onCombatStart",
        effect: (state) => {
            state.player.block += 6;
            log(`💾 [부팅 USB] 방어도 +6`);
        }
    },
    {
        id: "source_code",
        name: "원본 소스",
        icon: "📜", // 두루마리 (오래된 코드)
        desc: "전투 승리 시: 체력을 6 회복합니다.",
        trigger: "onVictory",
        effect: (state) => {
            state.player.hp = Math.min(state.player.hp + 6, state.player.maxHp);
            log(`📜 [원본 소스] 체력 6 회복`);
        }
    },

    // --- [공격형] ---
    {
        id: "gpu_overclock",
        name: "GPU 오버클럭",
        icon: "🔥", // 불 (발열/파워)
        desc: "전투 시작 시: 힘 2를 얻습니다.",
        trigger: "onCombatStart",
        effect: (state) => Status.applyStatus(state.player, 'strength', 2)
    },
    {
        id: "binary_blade",
        name: "이진법 검",
        icon: "🗡️", // 검
        desc: "턴 시작 시: 적에게 취약 1을 부여합니다.",
        trigger: "onTurnStart",
        effect: (state) => Status.applyStatus(state.enemy, 'vulnerable', 1)
    },
    {
        id: "macro_mouse",
        name: "매크로 마우스",
        icon: "🖱️", // 마우스
        desc: "공격 시: 50% 확률로 적에게 화상 2를 부여합니다.",
        trigger: "onAttack",
        effect: (state) => {
            if (state.enemy.element !== 'fire' && Math.random() < 0.5) {
                Status.applyStatus(state.enemy, 'burn', 2);
                log(`🖱️ [매크로 마우스] 화상 효과 발동!`);
            }
        }
    },
    {
        id: "logic_bomb_usb",
        name: "논리 폭탄",
        icon: "💣", // 폭탄
        desc: "전투 시작 시: 적에게 화상 10을 부여합니다.",
        trigger: "onCombatStart",
        effect: (state) => Status.applyStatus(state.enemy, 'burn', 10)
    },
    {
        id: "ddos_script",
        name: "DDOS 스크립트",
        icon: "👾", // 외계인/바이러스
        desc: "턴 시작 시: 적에게 약화 1을 부여합니다.",
        trigger: "onTurnStart",
        effect: (state) => Status.applyStatus(state.enemy, 'weak', 1)
    },

    // --- [방어형] ---
    {
        id: "firewall_hardware",
        name: "하드웨어 방화벽",
        icon: "🛡️", // 방패
        desc: "턴 종료 시: 방어도 3을 얻습니다.",
        trigger: "onTurnEnd",
        effect: (state) => {
            state.player.block += 3;
            log(`🛡️ [하드웨어 방화벽] 방어도 +3`);
        }
    },
    {
        id: "backup_server",
        name: "백업 서버",
        icon: "🔋", // 배터리 (예비 전력)
        desc: "전투 시작 시: 최대 체력이 10 증가합니다. (일회성 효과가 아님)",
        trigger: "onObtain", 
        effect: (state) => {
            state.player.maxHp += 10;
            state.player.hp += 10;
        }
    },
    {
        id: "cooling_fan",
        name: "쿨링 팬",
        icon: "🌀", // 회오리/팬
        desc: "방어 카드 사용 시: 50% 확률로 방어도 2를 추가로 얻습니다.",
        trigger: "onDefend",
        effect: (state) => {
            if (Math.random() < 0.5) {
                state.player.block += 2;
                log(`🌀 [쿨링 팬] 추가 방어도 +2`);
            }
        }
    },

    // --- [유틸리티/자원] ---
    {
        id: "energy_drink",
        name: "카페인 수액",
        icon: "🥤", // 음료
        desc: "전투 시작 시: 첫 턴에만 마나 +1을 얻습니다.",
        trigger: "onTurnStart",
        effect: (state) => {
            if (state.turnCount === 1) {
                 state.player.mana += 1;
                 log(`🥤 [카페인 수액] 첫 턴 보너스! 마나 +1`);
            }
        }
    },
    {
        id: "lucky_coin",
        name: "비트코인",
        icon: "🪙", // 동전
        desc: "전투 승리 시: 점수를 200점 추가로 얻습니다.",
        trigger: "onVictory",
        effect: (state) => {
            state.progress.score += 200;
            log(`🪙 [비트코인] 점수 +200`);
        }
    },
    {
        id: "bug_tracker",
        name: "버그 트래커",
        icon: "🐞", // 무당벌레 (버그)
        desc: "턴 시작 시: 적이 디버프 상태라면 힘 1을 얻습니다.",
        trigger: "onTurnStart",
        effect: (state) => {
            const s = state.enemy.status;
            if (s.vulnerable > 0 || s.weak > 0 || s.burn > 0 || s.wet > 0 || s.entangle > 0) {
                Status.applyStatus(state.player, 'strength', 1);
                log(`🐞 [버그 트래커] 디버프 감지 -> 힘 증가`);
            }
        }
    },

    // --- [특수/희귀] ---
    {
        id: "admin_token",
        name: "관리자 토큰",
        icon: "🔑", // 열쇠
        desc: "전투 시작 시: 적에게 젖음 5, 속박 5를 부여합니다.",
        trigger: "onCombatStart",
        effect: (state) => {
            Status.applyStatus(state.enemy, 'wet', 5);
            Status.applyStatus(state.enemy, 'entangle', 5);
        }
    },
    {
        id: "recycle_bin",
        name: "휴지통 복구",
        icon: "♻️", // 재활용 마크
        desc: "턴 종료 시: 버린 카드 더미가 10장 이상이면 방어도 10을 얻습니다.",
        trigger: "onTurnEnd",
        effect: (state) => {
            if (state.discardPile.length >= 10) {
                state.player.block += 10;
                log(`♻️ [휴지통 복구] 방어도 +10`);
            }
        }
    },
    {
        id: "vpn_tunnel",
        name: "VPN 터널링",
        icon: "🌐", // 지구본/네트워크
        desc: "턴 시작 시: 30% 확률로 적의 공격을 회피(방어도 +99)합니다.",
        trigger: "onTurnStart",
        effect: (state) => {
            if (Math.random() < 0.3) {
                state.player.block += 99;
                log(`🌐 [VPN] 공격 회피!`);
            }
        }
    },
    {
        id: "emergency_patch",
        name: "긴급 패치",
        icon: "🩹", // 반창고
        desc: "턴 시작 시: 체력이 30% 이하(24)라면 방어도 10을 얻습니다.",
        trigger: "onTurnStart",
        effect: (state) => {
            const lowHpThreshold = state.player.maxHp * 0.3;
            if (state.player.hp <= lowHpThreshold) {
                state.player.block += 10;
                log(`🩹 [긴급 패치] 위급 상황! 방어도 +10`);
            }
        }
    },
    {
        id: "dual_monitor",
        name: "듀얼 모니터",
        icon: "🖥️", // 모니터
        desc: "턴 시작 시: 30% 확률로 이번 턴 마나 +1을 얻습니다.",
        trigger: "onTurnStart",
        effect: (state) => {
            if (Math.random() < 0.3) {
                state.player.mana += 1;
                log(`🖥️ [듀얼 모니터] 작업 공간 확장! 마나 +1`);
            }
        }
    },
    {
        id: "gold_circuit",
        name: "금도금 회로",
        icon: "💠", // 칩/보석
        desc: "전투 시작 시: 보유한 코인 100G당 힘 1을 얻습니다.",
        trigger: "onCombatStart",
        effect: (state) => {
            const bonusStr = Math.floor(state.player.coins / 100);
            if (bonusStr > 0) {
                Status.applyStatus(state.player, 'strength', bonusStr);
                log(`💠 [금도금 회로] 자본의 힘! 힘 +${bonusStr}`);
            }
        }
    },
    {
        id: "garbage_collector",
        name: "가비지 컬렉터",
        icon: "🧹", // 빗자루
        desc: "공격 시: 체력을 2 회복합니다. (메모리 누수 방지)",
        trigger: "onAttack",
        effect: (state) => {
            if (state.player.hp < state.player.maxHp) {
                state.player.hp += 2;
                if(state.player.hp > state.player.maxHp) state.player.hp = state.player.maxHp;
                log(`🧹 [가비지 컬렉터] 체력 2 회복`);
            }
        }
    }
];