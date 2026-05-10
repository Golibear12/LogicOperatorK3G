$(document).ready(() => {
    let baseEquation = [];
    let fullTraceHTML = "";

    function formatToken(sym, limit) {
        if (!sym) return "";
        let base = sym.charAt(0);
        let power = sym.length - 1;
        if (power > limit) {
            let signChar = sym.includes('⁺') ? '+' : '-';
            return `${base}{(${power}),${signChar}}`;
        }
        return sym;
    }

    function getTextClass(sym) {
        if (!sym) return "";
        let b = sym.charAt(0);
        let s = sym.includes('⁺') ? '⁺' : '⁻';
        if (b === '∞' && s === '⁺') return 'txt-pos-inf';
        if (b === '∞' && s === '⁻') return 'txt-neg-inf';
        if (b === '1' && s === '⁺') return 'txt-pos-one';
        if (b === '1' && s === '⁻') return 'txt-neg-one';
        return '';
    }

    function updateLiveInputDisplay() {
        if (baseEquation.length === 0) {
            $("#liveInputBox").html('<span style="color:#475569; font-style:italic;">Awaiting sequence...</span>');
        } else {
            let html = baseEquation.map(sym => `<span class="${getTextClass(sym)}">${formatToken(sym, 200)}</span>`).join(" ");
            $("#liveInputBox").html(`<span class="hl-arrow">▶</span> ${html}`);
        }
    }

    function extractAndReduce(eq, indicesToRemove, resultSymbol) {
        let extracted = [];
        let remaining = [];
        for (let i = 0; i < eq.length; i++) {
            if (indicesToRemove.includes(i)) extracted.push(eq[i]);
            else remaining.push(eq[i]);
        }
        let traceStr = `<span class="hl-clash">[${extracted.map(s => formatToken(s, 200)).join(" ")}]</span>`;
        if (remaining.length > 0) {
            traceStr += " " + remaining.map(s => formatToken(s, 200)).join(" ");
        }
        let next_eq = [resultSymbol, ...remaining];
        return { triggered: true, eq: next_eq, trace: traceStr };
    }

    // --- STEP 1: UNIVERSAL EXCEPTION HANDLER ---
    function runExceptions(eq) {
        let has_inf_p = eq.some(t => t.charAt(0) === '∞' && t.includes('⁺'));
        let has_inf_m = eq.some(t => t.charAt(0) === '∞' && t.includes('⁻'));
        
        if (has_inf_p && has_inf_m) return { triggered: false, eq: eq, trace: "" };

        let inf_m_idx = eq.indexOf('∞⁻');
        let one_m_idx = eq.indexOf('1⁻');
        let one_p_indices = [];
        eq.forEach((v, i) => { if (v === '1⁺') one_p_indices.push(i); });

        if (inf_m_idx !== -1 && one_p_indices.length >= 3) {
            return extractAndReduce(eq, [inf_m_idx, one_p_indices[0], one_p_indices[1], one_p_indices[2]], "1⁺");
        }
        
        let has_inf = has_inf_p || has_inf_m;
        if (!has_inf && one_m_idx !== -1 && one_p_indices.length >= 2) {
            return extractAndReduce(eq, [one_m_idx, one_p_indices[0], one_p_indices[1]], "1⁺");
        }
        
        let fused_p_idx = eq.findIndex(t => t.charAt(0) === '1' && t.includes('⁺') && t.length > 2);
        
        if (inf_m_idx !== -1 && fused_p_idx !== -1) {
            let p = eq[fused_p_idx].length - 1;
            let res = p > 2 ? "1" + "⁺".repeat(p - 2) : "1⁻";
            return extractAndReduce(eq, [inf_m_idx, fused_p_idx], res);
        }
        if (!has_inf && one_m_idx !== -1 && fused_p_idx !== -1) {
            let p = eq[fused_p_idx].length - 1;
            let res = "1" + "⁺".repeat(p - 1);
            return extractAndReduce(eq, [one_m_idx, fused_p_idx], res);
        }

        return { triggered: false, eq: eq, trace: "" };
    }

    // --- STEP 2: LOWER MODE POSITIONAL FALLBACK ---
    function runPositionalLOWER(eq) {
        let has_inf_p = eq.some(t => t.includes('∞') && t.includes('⁺'));
        let has_inf_m = eq.some(t => t.includes('∞') && t.includes('⁻'));
        if (has_inf_p && has_inf_m) return { triggered: false, eq: eq, trace: "" };

        let trace_elements = [];
        let next_eq = [];
        let was_triggered = false;

        for (let i = 0; i < eq.length; i += 2) {
            if (i + 1 < eq.length) {
                let left = eq[i], right = eq[i + 1];
                let s1 = left.includes('⁺') ? '⁺' : '⁻', s2 = right.includes('⁺') ? '⁺' : '⁻';

                if (s1 !== s2) { 
                    // Clash
                    let b1 = left.charAt(0), b2 = right.charAt(0);
                    let str1 = (b1 === '∞' ? 2 : 1) * (left.length - 1);
                    let str2 = (b2 === '∞' ? 2 : 1) * (right.length - 1);
                    let res = "1⁻";

                    if (str1 > str2) res = b1 + s1.repeat(Math.max(1, str1 - str2));
                    else if (str2 > str1) res = b2 + s2.repeat(Math.max(1, str2 - str1));

                    trace_elements.push(`<span class="hl-clash">[${formatToken(left, 200)} ${formatToken(right, 200)}]</span>`);
                    next_eq.push(res);
                    was_triggered = true;
                } else { 
                    // FUSION: सिर्फ तभी जब Base सेम हो! (No mix-up of ∞ and 1)
                    if (left.charAt(0) === '1' && right.charAt(0) === '1') {
                        trace_elements.push(`<span class="hl-fuse">[${formatToken(left, 200)} ${formatToken(right, 200)}]</span>`);
                        next_eq.push("∞" + s1);
                        was_triggered = true;
                    } else if (left.charAt(0) === '∞' && right.charAt(0) === '∞') {
                        let p1 = left.length - 1, p2 = right.length - 1;
                        trace_elements.push(`<span class="hl-fuse">[${formatToken(left, 200)} ${formatToken(right, 200)}]</span>`);
                        next_eq.push("∞" + s1.repeat(p1 + p2));
                        was_triggered = true;
                    } else {
                        // Base अलग हैं (एक ∞ और एक 1), तो कुछ मत करो, ऐसे ही आगे भेज दो
                        next_eq.push(left, right);
                        trace_elements.push(formatToken(left, 200), formatToken(right, 200));
                    }
                }
            } else {
                next_eq.push(eq[i]);
                trace_elements.push(formatToken(eq[i], 200));
            }
        }
        return { triggered: was_triggered, eq: next_eq, trace: trace_elements.join(" ") };
    }

    $(".b1").click(() => addSymbol('∞⁺', ".b1"));
    $(".b2").click(() => addSymbol('∞⁻', ".b2"));
    $(".b3").click(() => addSymbol('1⁺', ".b3"));
    $(".b4").click(() => addSymbol('1⁻', ".b4"));

    function addSymbol(sym, btnClass) {
        let val = parseInt($(btnClass).siblings('.inps').val()) || 1;
        for (let i = 0; i < val; i++) baseEquation.push(sym);
        updateLiveInputDisplay();
    }

    $("#calcBtn").click(() => {
        if (baseEquation.length <= 1) return;
        let eq = [...baseEquation];
        let mode = $("input[name='modeSelect']:checked").val();
        let loops = 0;

        let runHTML = `<div class="trace-run">`;
        runHTML += `<div class="trace-header"><i class="fa-solid fa-microchip"></i> [ ${mode} MODE ACTIVATED ]</div>`;
        runHTML += `<div>Input: <span class="hl-result">${eq.map(s => formatToken(s, 200)).join(" ")}</span></div>`;

        while (eq.length > 1 && loops < 500) {
            
            let ex = runExceptions(eq);
            if (ex.triggered) {
                runHTML += `<div><span class="hl-arrow">➜</span> Exception Catch: ${ex.trace}</div>`;
                eq = ex.eq;
                runHTML += `<div><span class="hl-arrow">➜</span> Step Result: <span class="hl-result">${eq.map(s => formatToken(s, 200)).join(" ")}</span></div>`;
                loops++;
                continue; 
            }

            if (mode === "LOWER") {
                let pos = runPositionalLOWER(eq);
                if (pos.triggered) {
                    runHTML += `<div><span class="hl-arrow">➜</span> Algorithm Catch: ${pos.trace}</div>`;
                    eq = pos.eq;
                    runHTML += `<div><span class="hl-arrow">➜</span> Step Result: <span class="hl-result">${eq.map(s => formatToken(s, 200)).join(" ")}</span></div>`;
                    loops++;
                    continue; 
                }
            }

            let has_p = eq.some(t => t.includes('⁺')), has_m = eq.some(t => t.includes('⁻'));
            if (has_p && has_m) {
                let ip=0, im=0, op=0, om=0;
                eq.forEach(t => {
                    let b=t[0], s=t.includes('⁺')?'⁺':'⁻', p=t.length-1;
                    if(b==='∞' && s==='⁺') ip += p; else if(b==='∞' && s==='⁻') im += p;
                    else if(b==='1' && s==='⁺') op += p; else om += p;
                });
                let n_eq = [], pairs = [];
                while(ip>0 && im>0) { ip--; im--; pairs.push("[∞⁺ ∞⁻]"); n_eq.push("1⁻"); }
                while(ip>0 && om>0) { ip--; om--; pairs.push("[∞⁺ 1⁻]"); n_eq.push("1⁺"); }
                while(im>0 && op>0) { im--; op--; pairs.push("[∞⁻ 1⁺]"); n_eq.push("∞⁻"); }
                while(op>0 && om>0) { op--; om--; pairs.push("[1⁺ 1⁻]"); n_eq.push("1⁻"); }
                
                let left = [];
                for(let i=0; i<ip; i++) left.push("∞⁺"); for(let i=0; i<im; i++) left.push("∞⁻");
                for(let i=0; i<op; i++) left.push("1⁺"); for(let i=0; i<om; i++) left.push("1⁻");
                
                runHTML += `<div><span class="hl-arrow">➜</span> Clash: ${pairs.join(" ")} ${left.map(s => formatToken(s, 200)).join(" ")}</div>`;
                eq = n_eq.concat(left);
                loops++;
                continue; 
            } 
            
            let sign = eq[0].includes('⁺') ? '⁺' : '⁻', t_ones = 0, t_infs = 0;
            eq.forEach(t => { if(t[0]==='1') t_ones += (t.length-1); else t_infs += (t.length-1); });
            if (mode === "LOWER") {
                let upg = Math.floor(t_ones / 2), rem = t_ones % 2;
                eq = []; 
                if (t_infs + upg > 0) eq.push("∞" + sign.repeat(t_infs + upg)); 
                if (rem > 0) eq.push("1" + sign);
            } else {
                eq = []; if (t_infs > 0) eq.push("∞" + sign.repeat(t_infs)); if (t_ones > 0) eq.push("1" + sign.repeat(t_ones));
            }
            break; 
        }

        runHTML += `<div style="margin-top: 10px;"><span class="hl-arrow">■</span> Final Stack: <span class="hl-final">${eq.map(s => formatToken(s, 200)).join(" ")}</span></div></div>`;
        fullTraceHTML += runHTML;
        $("#traceContent").html(fullTraceHTML);
        $("#finalResult").html(eq.map(sym => `<span class="${getTextClass(sym)}" style="font-size: 38px;">${formatToken(sym, 2)}</span>`).join(" "));
    });

    $("#clearBtn").click(() => {
        baseEquation = []; fullTraceHTML = ""; updateLiveInputDisplay();
        $("#traceContent").html('<div class="empty-log">System Purged. Ready.</div>');
        $("#finalResult").text("--");
    });
    $("#copyBtn").click(function () {
                let textToCopy = document.getElementById("traceContent").innerText;
                if (textToCopy.includes("System Purged") || textToCopy.includes("Ready")) return;

                navigator.clipboard.writeText(textToCopy).then(() => {
                    let originalHTML = $(this).html();
                    $(this).html('<i class="fa-solid fa-check"></i> Copied!');
                    $(this).css('background', '#10b981');
                    setTimeout(() => {
                        $(this).html(originalHTML);
                        $(this).css('background', '#334155');
                    }, 2000);
                });
            });
});
