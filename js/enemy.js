// [일반 몹] 10마리
export const NORMAL_ENEMIES = [
    {
        name: "Glitch.min", // 1. 가장 약한 잡몹
        hp: 50,
        actions: [
            { type: 'attack', value: 5 },
            { type: 'debuff', status: 'weak', value: 1, msg: "오류 전파!" }, // [추가] 약화
            { type: 'attack', value: 5 }
        ]
    },
    {
        name: "Spam_Bot", // 2. 약하지만 공격 횟수가 많음
        hp: 45,
        actions: [
            { type: 'debuff', status: 'vulnerable', value: 2, msg: "보안 취약점 스캔" }, // [추가] 취약
            { type: 'attack', value: 3 },
            { type: 'attack', value: 3 },
            { type: 'wait', value: 0, msg: "과열로 식히는 중..." }
        ]
    },
    {
        name: "Mining_Script", // 3. 자원 채굴 컨셉 (방어 위주)
        hp: 55,
        actions: [
            { type: 'debuff', status: 'weak', value: 2, msg: "리소스 점유율 상승" }, // [추가] 힘 증가
            { type: 'defend', value: 8 },
            { type: 'attack', value: 6 }
        ]
    },
    {
        name: "404_Not_Found", // 4. 회피형 (높은 방어)
        hp: 60,
        actions: [
            { type: 'defend', value: 12 },
            { type: 'wait', value: 0, msg: "경로를 찾을 수 없음..." },
            { type: 'attack', value: 10 }
        ]
    },
    {
        name: "Trojan_Horse", // 5. 공격형 스탠다드
        hp: 65,
        actions: [
            { type: 'debuff', status: 'vulnerable', value: 2, msg: "뒷문 개방!" }, // [추가] 취약
            { type: 'attack', value: 12 },
            { type: 'attack', value: 12 }
        ]
    },
    {
        name: "Worm.vbs", // 6. 끈질긴 몹
        hp: 75,
        actions: [
            { type: 'attack', value: 8 },
            { type: 'debuff', status: 'weak', value: 2, msg: "시스템 성능 저하" }, // [추가] 약화
            { type: 'defend', value: 10 }
        ]
    },
    {
        name: "Ransomware", // 7. 패턴형 (충전 후 한방)
        hp: 60,
        actions: [
           { type: 'debuff', status: 'vulnerable', value: 3, msg: "심각한 보안 경고!" }, // [추가] 영구 지속 느낌의 취약
            { type: 'wait', value: 0, msg: "몸값을 요구합니다!" },
            { type: 'attack', value: 20 } // 강력한 한 방
        ]
    },
    {
        name: "DDOS_Zombie", // 8. 무지성 공격
        hp: 65,
        actions: [
            { type: 'buff', status: 'strength', value: 1, msg: "트래픽 증폭" }, // [추가] 매 턴 강해짐
            { type: 'attack', value: 5 },
            { type: 'attack', value: 5 },
            { type: 'attack', value: 5 }
        ]
    },
    {
        name: "Firewall.d", // 9. 방어형 (탱커)
        hp: 80,
        actions: [
            { type: 'defend', value: 15 },
            { type: 'buff', status: 'strength', value: 3, msg: "보안 정책 강화" }, // [추가] 힘
            { type: 'attack', value: 8 }
        ]
    },
    {
        name: "Logic_Bomb", // 10. 자폭 컨셉 (매우 위험)
        hp: 65,
        actions: [
            { type: 'wait', value: 0, msg: "타이머 작동: 3" },
            { type: 'wait', value: 0, msg: "타이머 작동: 2" },
            { type: 'wait', value: 0, msg: "타이머 작동: 1" },
            { type: 'attack', value: 30 }
        ]
    },
    {
        name: "Cultist.exe", // 광신도 컨셉
        hp: 68, // 적당한 체력
        actions: [
            // 1턴: 의식(Ritual) 버프 시전 (매 턴 힘 3씩 증가)
            { type: 'buff', status: 'ritual', value: 3, msg: "카카!" },
            
            // 2턴 이후: 기본 공격력 3으로 연속 공격
            // (의식 효과로 인해 실제 데미지는 6 -> 9 -> 12 -> 15... 로 매 턴 강해집니다)
            { type: 'attack', value: 3 },
            { type: 'attack', value: 3 },
            { type: 'attack', value: 3 },
            { type: 'attack', value: 3 },
            { type: 'attack', value: 3 } 
            // 6턴 동안 전투가 안 끝나면 다시 의식을 쓰겠지만, 보통 그 전에 승부가 납니다.
        ]
    }
];

// [보스 몹] 3마리
export const BOSS_ENEMIES = [
    {
        name: "Mainframe_AI", // 1. 밸런스형 보스
        hp: 135,
        isBoss: true, // 보스 식별용 플래그
        actions: [
            { type: 'buff', status: 'strength', value: 2, msg: "연산 능력 오버클럭" }, // 힘
            { type: 'attack', value: 10 },
            { type: 'debuff', status: 'weak', value: 2, msg: "사용자 권한 축소" }, // 약화
            { type: 'attack', value: 15 }
        ]
    },
    {
        name: "Kernel_Panic", // 2. 공격형 보스 (폭주)
        hp: 140,
        isBoss: true,
        actions: [
            { type: 'debuff', status: 'vulnerable', value: 2, msg: "커널 메모리 덤프" }, // 취약
            { type: 'attack', value: 15 },
            { type: 'attack', value: 5 },
            { type: 'attack', value: 5 },
            { type: 'buff', status: 'strength', value: 3, msg: "오류 로그 폭주!" }
        ]
    },
    {
        name: "The_Architect", // 3. 방어/설계형 최종 보스
        hp: 150,
        isBoss: true,
        actions: [
            { type: 'defend', value: 30 },
            { type: 'debuff', status: 'weak', value: 3, msg: "현실 조작..." }, // 긴 약화
            { type: 'attack', value: 12 },
            { type: 'debuff', status: 'vulnerable', value: 2, msg: "코드 재작성" },
            { type: 'attack', value: 12 }
        ]
    }
];