import { log } from './util.js';

// 상태이상 초기값 (복사용)
export const INITIAL_STATUS = {
    strength: 0,   // 힘
    vulnerable: 0, // 취약 (턴 수)
    weak: 0,       // 약화 (턴 수)
    ritual: 0,     // 의식 (수치)
    burn: 0,       // 화상 (피해량)
    entangle: 0,   // 속박 (방어도 감소량)
    wet: 0,        // 젖음 (추가 피해량)
    overheat: 0,
    rage: 0,
    exception_mode: 0
};

// 1. 상태이상 부여 함수
export function applyStatus(target, type, value) {
    if (!target.status) target.status = { ...INITIAL_STATUS };

    const element = target.element;

    if (type === 'burn') {
        if (element === 'fire') {
            log(`🚫 [상성] 불 속성(${target.name})이라 화상이 통하지 않습니다!`);
            return; // 무효
        }
        if (element === 'water') {
            log(`🚫 [상성] 물 속성(${target.name})이라 화상이 꺼졌습니다!`);
            return; // 무효
        }
        if (element === 'grass') {
            value *= 2; // 수치 2배
            log(`🔥 [상성] 풀 속성(${target.name})에 불이 번집니다! (화상 2배)`);
        }
    }

    if (type === 'entangle') {
        if (element === 'grass') {
            log(`🚫 [상성] 풀 속성(${target.name})이라 덩굴에 엉키지 않습니다!`);
            return; // 무효
        }
        if (element === 'fire') {
            log(`🚫 [상성] 불 속성(${target.name})이 덩굴을 태워버렸습니다! (속박 무효)`);
            return; // 무효
        }
        if (element === 'water') {
            value += 1; // 수치 +1
            log(`🌿 [상성] 물 속성(${target.name})이라 덩굴이 더 질겨집니다! (속박 +1)`);
        }
    }

    if (type === 'wet') {
        if (element === 'water') {
            log(`🚫 [상성] 물 속성(${target.name})이라 이미 젖어있습니다! (젖음 무효)`);
            return; // 무효
        }
        if (element === 'grass') {
            log(`🌱 [상성] 풀 속성(${target.name})이 물을 흡수해 성장합니다! (젖음 무효 -> 힘 +1)`);
            // 젖음 대신 힘(Strength)을 부여하기 위해 재귀 호출
            applyStatus(target, 'strength', 1); 
            return; // 젖음은 적용되지 않음
        }
        if (element === 'fire') {
            log(`💨 [상성] 불 속성(${target.name})이 식어버립니다! (약화 +1)`);
            // 약화(Weak) 추가 부여
            applyStatus(target, 'weak', 1);
            // 젖음 효과는 그대로 적용되도록 아래 switch문으로 진행
        }
    }

    switch (type) {
        case 'strength':
            target.status.strength += value;
            if (target.status.strength > 999) target.status.strength = 999; // 최대 999 제한
            log(`💪 힘 ${value} 증가 (현재: ${target.status.strength})`);
            break;
        case 'vulnerable':
            target.status.vulnerable += value; // 턴 수 누적
            log(`💔 취약 부여! (${target.status.vulnerable}턴)`);
            break;
        case 'weak':
            target.status.weak += value; // 턴 수 누적
            log(`📉 약화 부여! (${target.status.weak}턴)`);
            break;
        case 'ritual':
            target.status.ritual += value;
            log(`🕯️ 의식 수치 증가 (+${value})`);
            break;
        case 'burn':
            target.status.burn += value;
            log(`🔥 화상 ${value} 중첩!`);
            break;
        case 'entangle':
            target.status.entangle += value;
            log(`🌿 속박됨! (방어도 획득 -${value})`);
            break;
        case 'wet':
            target.status.wet += value;
            log(`💧 젖음 상태! (추가 피해 +${target.status.wet})`);
            break;
        case 'overheat':
            target.status.overheat += value;
            log(`⚠️ 과부하 예약: 턴 종료 시 힘 -${value}`);
            break;
        case 'rage':
            target.status.rage += value;
            log(`🛡️ 트래픽 필터 활성화! (공격 시 방어도 +${value})`);
            break;
        case 'exception_mode':
            target.status.exception_mode += value;
            log(`⚠️ 예외 처리 프로토콜 가동 (자해 시 힘 +${value})`);
            break;
    }
}

// 2. 공격 데미지 계산 (힘, 약화 적용)
export function calculateAttackDamage(baseDamage, attacker) {
    let damage = baseDamage;

    // 힘 적용
    if (attacker.status.strength !== 0) {
        damage += attacker.status.strength;
    }

    // 약화 적용 (25% 감소)
    if (attacker.status.weak > 0) {
        damage = Math.floor(damage * 0.75);
    }

    return Math.max(0, damage);
}

// 3. 피격 데미지 계산 (취약, 젖음 적용)
export function calculateIncomingDamage(damage, defender) {
    let finalDamage = damage;

    // 취약 적용 (50% 증가)
    if (defender.status.vulnerable > 0) {
        finalDamage = Math.floor(finalDamage * 1.5);
    }

    // 젖음 적용 (고정 피해 추가)
    if (defender.status.wet > 0) {
        finalDamage += defender.status.wet;
    }

    return finalDamage;
}

// 4. 방어도 획득량 계산 (속박 적용)
export function calculateBlockGain(baseBlock, defender) {
    let block = baseBlock;

    // 속박 적용 (수치만큼 감소)
    if (defender.status.entangle > 0) {
        block -= defender.status.entangle;
    }

    return Math.max(0, block);
}

// 5. 턴 시작 시 효과 처리 (의식)
export function handleTurnStart(entity) {
    if (entity.status.ritual > 0) {
        applyStatus(entity, 'strength', entity.status.ritual);
        log(`🕯️ 의식 효과: 힘이 ${entity.status.ritual} 증가했습니다.`);
    }
}

// 6. 턴 종료 시 효과 처리 (화상, 젖음, 버프 차감)
export function handleTurnEnd(entity) {
    let damageTaken = 0;

    // 화상: 피해 입고 사라짐
    if (entity.status.burn > 0) {
        damageTaken += entity.status.burn;
        log(`🔥 화상 피해 ${entity.status.burn}을 입었습니다.`);
        entity.status.burn = 0; // 초기화
    }

    // 젖음: 수치 1 감소
    if (entity.status.wet > 0) {
        entity.status.wet -= 1;
    }

    if (entity.status.overheat > 0) {
        const lostStr = entity.status.overheat;
        entity.status.strength -= lostStr;
        if (entity.status.strength < 0) entity.status.strength = 0; // 힘이 음수가 되지 않게 방지
        
        log(`🔌 과부하로 인해 힘이 ${lostStr} 감소했습니다.`);
        entity.status.overheat = 0; // 초기화
    }

    // 취약: 1턴 감소
    if (entity.status.vulnerable > 0) {
        entity.status.vulnerable -= 1;
    }

    // 약화: 1턴 감소
    if (entity.status.weak > 0) {
        entity.status.weak -= 1;
    }

    // 속박: 지속 턴 개념이 명시되지 않았으나, 보통 1턴 감소 혹은 유지.
    // 여기서는 턴마다 1씩 감소하는 것으로 구현 (너무 강력하므로)
    if (entity.status.entangle > 0) {
        entity.status.entangle -= 1;
    }

    if (entity.status.rage > 0) {
        entity.status.rage = 0; 
    }

    return damageTaken; // 턴 종료 시 입은 총 피해량 반환
}