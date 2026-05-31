$(document).ready(function() {
    let activeSequence = [];

    // ---- 1. UI KEYPAD & SEQUENCE BUILDER ----
    $('.box-btn').on('click', function() {
        let tokenType = $(this).text().trim(); // "∞⁺", "∞⁻", "1⁺", "1⁻"
        let repeatCount = parseInt($(this).siblings('.inps').val()) || 1;
        
        if (repeatCount < 1) repeatCount = 1;

        for (let i = 0; i < repeatCount; i++) {
            activeSequence.push(tokenType);
        }
        renderLiveInput();
    });

    // PURGE SYSTEM (RESET ALL STATE)
    $('#clearBtn').on('click', function() {
        activeSequence = [];
        $('.inps').val('1'); 
        $('#finalResult').text('--').css('color', 'var(--text-main)');
        $('#liveInputBox').html('<span style="color:#475569; font-style:italic; font-size: 18px;">Awaiting sequence...</span>');
        $('#traceContent').html('<div class="empty-log">Log trace will appear here after execution.</div>');
    });

    // COPY TRACE MECHANISM
    $('#copyBtn').on('click', function() {
        let textToCopy = $('#traceContent').text();
        if (activeSequence.length === 0) return;
        
        navigator.clipboard.writeText(textToCopy).then(function() {
            let originalText = $('#copyBtn').html();
            $('#copyBtn').html('<i class="fa-solid fa-check"></i> Copied!');
            setTimeout(() => { $('#copyBtn').html(originalText); }, 1500);
        });
    });

    function renderLiveInput() {
        if (activeSequence.length === 0) {
            $('#liveInputBox').html('<span style="color:#475569; font-style:italic; font-size: 18px;">Awaiting sequence...</span>');
        } else {
            $('#liveInputBox').text(activeSequence.join(' '));
        }
    }

    // ---- 2. HELPER: COMPRESSION LOGIC (Limit > 2 Rule) ----
    function formatTokenDisplay(base, sign, power) {
        if (power === 0) return '';
        let s = (sign === '+' ? '⁺' : '⁻');
        if (power > 2) {
            return `${base}{${power},${s}}`;
        } else {
            return base + s.repeat(power);
        }
    }

    function getUncollapsedDisplay(tokens) {
        return tokens.map(t => formatTokenDisplay(t.base === 'inf' ? '∞' : '1', t.sign, t.power)).join(' ');
    }

    // ---- 3. ADVANCED SIMULTANEOUS BRACKET ENGINE ----
    $('#calcBtn').on('click', function() {
        if (activeSequence.length === 0) {
            $('#traceContent').html('<div class="empty-log" style="color:var(--accent-red)">Error: Add elements to pool before execution!</div>');
            return;
        }

        let mode = $('input[name="modeSelect"]:checked').val();
        let traceHTML = [];
        
        let currentTokens = activeSequence.map(token => {
            return {
                base: token.includes('∞') ? 'inf' : '1',
                sign: token.includes('⁺') ? '+' : '-',
                power: 1
            };
        });

        traceHTML.push(`<div class="trace-step">[SYSTEM INITIALIZED] Mode set to: <span class="trace-highlight">${mode}</span></div>`);
        traceHTML.push(`<div class="trace-step">[INITIAL POOL]: ${getUncollapsedDisplay(currentTokens)}</div>`);

        let executionRunning = true;
        let safetyGuard = 0;

        while (executionRunning && safetyGuard < 500) {
            safetyGuard++;

            let infPos = [], infNeg = [], onePos = [], oneNeg = [];
            currentTokens.forEach(t => {
                if (t.base === 'inf' && t.sign === '+') infPos.push(t);
                else if (t.base === 'inf' && t.sign === '-') infNeg.push(t);
                else if (t.base === '1' && t.sign === '+') onePos.push(t);
                else if (t.base === '1' && t.sign === '-') oneNeg.push(t);
            });

            let clashPairs = [];
            let fusionPairs = [];

            while (infPos.length > 0 && infNeg.length > 0) clashPairs.push([infPos.shift(), infNeg.shift(), 'inf_inf']);
            while (infPos.length > 0 && oneNeg.length > 0) clashPairs.push([infPos.shift(), oneNeg.shift(), 'inf_one_pos']);
            while (infNeg.length > 0 && onePos.length > 0) clashPairs.push([infNeg.shift(), onePos.shift(), 'inf_one_neg']);
            while (onePos.length > 0 && oneNeg.length > 0) clashPairs.push([onePos.shift(), oneNeg.shift(), 'one_one']);

            while (infPos.length >= 2) fusionPairs.push([infPos.shift(), infPos.shift()]);
            while (infNeg.length >= 2) fusionPairs.push([infNeg.shift(), infNeg.shift()]);
            while (onePos.length >= 2) fusionPairs.push([onePos.shift(), onePos.shift()]);
            while (oneNeg.length >= 2) fusionPairs.push([oneNeg.shift(), oneNeg.shift()]);

            let singletons = [...infPos, ...infNeg, ...onePos, ...oneNeg];

            if (clashPairs.length === 0 && fusionPairs.length === 0) {
                executionRunning = false;
                break;
            }

            let bracketRow = [];
            const helperStr = (t) => formatTokenDisplay(t.base === 'inf' ? '∞' : '1', t.sign, t.power);

            clashPairs.forEach(p => bracketRow.push(`[${helperStr(p[0])} ${helperStr(p[1])}]`));
            fusionPairs.forEach(p => bracketRow.push(`[${helperStr(p[0])} ${helperStr(p[1])}]`));
            singletons.forEach(s => bracketRow.push(helperStr(s)));

            traceHTML.push(`<div class="trace-step">➔ ${bracketRow.join(' ')}</div>`);

            let nextTokens = [];

            clashPairs.forEach(p => {
                let t1 = p[0], t2 = p[1], type = p[2];

                if (type === 'inf_inf') {
                    nextTokens.push({ base: '1', sign: '+', power: t1.power });
                    nextTokens.push({ base: '1', sign: '-', power: t2.power });
                } 
                else if (type === 'inf_one_pos') { 
                    if (t2.power > t1.power) {
                        nextTokens.push({ base: '1', sign: '+', power: t1.power });
                        nextTokens.push({ base: '1', sign: '-', power: t2.power - t1.power });
                    } else {
                        nextTokens.push({ base: 'inf', sign: '+', power: t1.power });
                    }
                } 
                else if (type === 'inf_one_neg') { 
                    if (t2.power > t1.power) {
                        nextTokens.push({ base: '1', sign: '-', power: t1.power });
                        nextTokens.push({ base: '1', sign: '+', power: t2.power - t1.power });
                    } else {
                        nextTokens.push({ base: 'inf', sign: '-', power: t1.power });
                    }
                } 
                else if (type === 'one_one') { 
                    if (t2.power > t1.power) {
                        nextTokens.push({ base: '1', sign: '-', power: t2.power - t1.power });
                    } else if (t1.power > t2.power) {
                        nextTokens.push({ base: '1', sign: '+', power: t1.power - t2.power });
                    } else {
                        nextTokens.push({ base: '1', sign: '-', power: t2.power });
                    }
                }
            });

            fusionPairs.forEach(p => {
                nextTokens.push({ base: p[0].base, sign: p[0].sign, power: p[0].power + p[1].power });
            });

            nextTokens.push(...singletons);
            currentTokens = nextTokens;

            let intermediateView = getUncollapsedDisplay(currentTokens);
            if (intermediateView) {
                traceHTML.push(`<div class="trace-step">➔ ${intermediateView}</div>`);
            }
        }

        // ---- 4. LOWER MODE EXTENSION (With Grand Fusion Fix) ----
        if (mode === 'LOWER') {
            let hasTransitioned = false;
            let lowerUpgradedList = [];

            currentTokens.forEach(t => {
                if (t.base === '1' && t.power > 1) {
                    hasTransitioned = true;
                    let upCount = Math.floor(t.power / 2);
                    let remCount = t.power % 2;

                    let initialDisplay = formatTokenDisplay('1', t.sign, t.power);
                    let visualTransition = [];
                    if (upCount > 0) visualTransition.push(formatTokenDisplay('∞', t.sign, upCount));
                    if (remCount > 0) visualTransition.push(formatTokenDisplay('1', t.sign, remCount));

                    traceHTML.push(`<div class="trace-step"><span class="trace-highlight">[LOWER TRANSITION]</span><br>➔ [${initialDisplay}] becomes ${visualTransition.join(' ')}</div>`);

                    if (upCount > 0) lowerUpgradedList.push({ base: 'inf', sign: t.sign, power: upCount });
                    if (remCount > 0) lowerUpgradedList.push({ base: '1', sign: t.sign, power: remCount });
                } else {
                    lowerUpgradedList.push(t);
                }
            });

            if (hasTransitioned) {
                currentTokens = lowerUpgradedList;
                traceHTML.push(`<div class="trace-step">➔ ${getUncollapsedDisplay(currentTokens)}</div>`);

                // 🔥 CRITICAL FIX: GRAND FUSION PASS (सारे नए-पुराने सेम टोकन्स को आपस में कंबाइन करना)
                let finalConsolidated = { 'inf+': 0, 'inf-': 0, '1+': 0, '1-': 0 };
                currentTokens.forEach(t => {
                    finalConsolidated[t.base + t.sign] += t.power;
                });

                currentTokens = [];
                if (finalConsolidated['inf+'] > 0) currentTokens.push({ base: 'inf', sign: '+', power: finalConsolidated['inf+'] });
                if (finalConsolidated['inf-'] > 0) currentTokens.push({ base: 'inf', sign: '-', power: finalConsolidated['inf-'] });
                if (finalConsolidated['1+'] > 0) currentTokens.push({ base: '1', sign: '+', power: finalConsolidated['1+'] });
                if (finalConsolidated['1-'] > 0) currentTokens.push({ base: '1', sign: '-', power: finalConsolidated['1-'] });

                // कंबाइन होने के बाद का फाइनल साफ़-सुथरा ट्रैक प्रिंट करना
                traceHTML.push(`<div class="trace-step">➔ ${getUncollapsedDisplay(currentTokens)}</div>`);
            }
        }

        // ---- 5. RENDER FINAL LOGS AND OUTPUTS ----
        let finalResultString = getUncollapsedDisplay(currentTokens) || '∅ (Origin)';
        traceHTML.push(`<div class="trace-step trace-success">[PROCESS COMPLETED] Terminal stable state locked.</div>`);

        $('#traceContent').html(traceHTML.join(''));
        $('#finalResult').text(finalResultString);

        if (finalResultString.includes('⁺')) {
            $('#finalResult').css('color', 'var(--accent-green)');
        } else if (finalResultString.includes('⁻')) {
            $('#finalResult').css('color', 'var(--accent-red)');
        } else {
            $('#finalResult').css('color', 'var(--accent-blue)');
        }
    });
});