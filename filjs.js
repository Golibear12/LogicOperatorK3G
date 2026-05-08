
$(document).ready(() => {
    let baseEquation = [];
    let fullTraceHTML = "";

    // Formatter to apply 20/200 limits
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

            // Simple text colors instead of bulky background boxes
            function getTextClass(sym) {
                let b = sym.charAt(0);
                let s = sym.includes('⁺') ? '⁺' : '⁻';
                if (b === '∞' && s === '⁺') return 'txt-pos-inf';
                if (b === '∞' && s === '⁻') return 'txt-neg-inf';
                if (b === '1' && s === '⁺') return 'txt-pos-one';
                if (b === '1' && s === '⁻') return 'txt-neg-one';
                return '';
            }

            // ADD SYMBOLS
            $(".b1").click(() => addSymbol('∞⁺', ".b1"));
            $(".b2").click(() => addSymbol('∞⁻', ".b2"));
            $(".b3").click(() => addSymbol('1⁺', ".b3"));
            $(".b4").click(() => addSymbol('1⁻', ".b4"));

            function addSymbol(sym, btnClass) {
                let inputVal = $(btnClass).siblings('.inps').val();
                let count = parseInt(inputVal) || 1;
                for (let i = 0; i < count; i++) {
                    baseEquation.push(sym);
                }
                updateLiveInputDisplay();
            }

            // Update the live input directly inside the trace board at the top
            function updateLiveInputDisplay() {
                if (baseEquation.length === 0) {
                    $("#liveInputBox").html('<span style="color:#475569; font-style:italic; font-size: 18px;">Awaiting sequence...</span>');
                } else {
                    // Limit 200 for live viewing inside the big box
                    let html = baseEquation.map(sym => `<span class="${getTextClass(sym)}">${formatToken(sym, 200)}</span>`).join(" ");
                    $("#liveInputBox").html(`<span class="hl-arrow">▶</span> <span style="color:#94a3b8; font-size:18px;">Sequence:</span> ${html}`);
                }
            }

            // CORE ENGINE (CALCULATE & TRACE)
            $("#calcBtn").click(() => {
                if (baseEquation.length <= 1) return;

                let eq = [...baseEquation];
                let mode = $("input[name='modeSelect']:checked").val();
                let loops = 0;

                let runHTML = `<div class="trace-run">`;
                runHTML += `<div class="trace-header"><i class="fa-solid fa-microchip"></i> [ ${mode} MODE ACTIVATED ]</div>`;
                runHTML += `<div>Input: <span class="hl-result">${eq.map(s => formatToken(s, 200)).join(" ")}</span></div>`;

                while (eq.length > 1 && loops < 100) {
                    let has_plus = eq.some(t => t.includes('⁺'));
                    let has_minus = eq.some(t => t.includes('⁻'));

                    if (has_plus && has_minus) {
                        let inf_p = 0, inf_m = 0, one_p = 0, one_m = 0;

                        eq.forEach(t => {
                            let b = t.charAt(0);
                            let s = t.includes('⁺') ? '⁺' : '⁻';
                            let p = t.length - 1;
                            if (b === '∞' && s === '⁺') inf_p += p;
                            if (b === '∞' && s === '⁻') inf_m += p;
                            if (b === '1' && s === '⁺') one_p += p;
                            if (b === '1' && s === '⁻') one_m += p;
                        });

                        let pairs_formed = [];
                        let next_eq = [];
                        let leftovers = [];

                        while (inf_p > 0 && inf_m > 0) { inf_p--; inf_m--; pairs_formed.push(`<span class="hl-clash">[∞⁺ ∞⁻]</span>`); next_eq.push("1⁻"); }
                        while (inf_p > 0 && one_m > 0) { inf_p--; one_m--; pairs_formed.push(`<span class="hl-clash">[∞⁺ 1⁻]</span>`); next_eq.push("1⁺"); }
                        while (inf_m > 0 && one_p > 0) { inf_m--; one_p--; pairs_formed.push(`<span class="hl-clash">[∞⁻ 1⁺]</span>`); next_eq.push("∞⁻"); }
                        while (one_p > 0 && one_m > 0) { one_p--; one_m--; pairs_formed.push(`<span class="hl-clash">[1⁺ 1⁻]</span>`); next_eq.push("1⁻"); }

                        for (let i = 0; i < inf_p; i++) leftovers.push("∞⁺");
                        for (let i = 0; i < inf_m; i++) leftovers.push("∞⁻");
                        for (let i = 0; i < one_p; i++) leftovers.push("1⁺");
                        for (let i = 0; i < one_m; i++) leftovers.push("1⁻");

                        let trace_pair_str = pairs_formed.join(" ");
                        if (leftovers.length > 0) trace_pair_str += " " + leftovers.map(s => formatToken(s, 200)).join(" ");

                        runHTML += `<div><span class="hl-arrow">➜</span> Pair: ${trace_pair_str.trim()}</div>`;
                        next_eq = next_eq.concat(leftovers);
                        runHTML += `<div><span class="hl-arrow">➜</span> Result: <span class="hl-result">${next_eq.map(s => formatToken(s, 200)).join(" ")}</span></div>`;

                        eq = next_eq;
                    }
                    else {
                        let ones = [];
                        let infs = [];
                        let sign = eq[0].includes('⁺') ? '⁺' : '⁻';

                        eq.forEach(t => {
                            let p = t.length - 1;
                            for (let i = 0; i < p; i++) {
                                if (t.charAt(0) === '1') ones.push(`1${sign}`);
                                if (t.charAt(0) === '∞') infs.push(`∞${sign}`);
                            }
                        });

                        let rearranged = [...ones, ...infs];
                        if (rearranged.join(" ") !== eq.join(" ")) {
                            runHTML += `<div><span class="hl-arrow">➜</span> Arrange: <span class="hl-result">${rearranged.map(s => formatToken(s, 200)).join(" ")}</span></div>`;
                        }

                        let one_pow = ones.length;
                        let inf_pow = infs.length;
                        let fused = [];
                        let fuse_trace = [];

                        if (one_pow > 0) {
                            if (one_pow > 1) fuse_trace.push(`<span class="hl-fuse">[${ones.map(s => formatToken(s, 200)).join(" ")}]</span>`);
                            else fuse_trace.push(formatToken(ones[0], 200));
                            fused.push('1' + sign.repeat(one_pow));
                        }
                        if (inf_pow > 0) {
                            if (inf_pow > 1) fuse_trace.push(`<span class="hl-fuse">[${infs.map(s => formatToken(s, 200)).join(" ")}]</span>`);
                            else fuse_trace.push(formatToken(infs[0], 200));
                            fused.push('∞' + sign.repeat(inf_pow));
                        }

                        if (one_pow > 1 || inf_pow > 1) {
                            runHTML += `<div><span class="hl-arrow">➜</span> Fuse: ${fuse_trace.join(" ")}</div>`;
                            runHTML += `<div><span class="hl-arrow">➜</span> Output: <span class="hl-result">${fused.map(s => formatToken(s, 200)).join(" ")}</span></div>`;
                        }

                        if (mode === "LOWER" && one_pow >= 2) {
                            let upgrades = Math.floor(one_pow / 2);
                            let rem_ones = one_pow % 2;

                            let upgrade_target = `1${sign.repeat(one_pow)}`;
                            let upgrade_str = `<span class="hl-fuse">[${formatToken(upgrade_target, 200)}]</span>`;
                            let other_tokens = inf_pow > 0 ? ` ${formatToken('∞' + sign.repeat(inf_pow), 200)}` : ``;

                            runHTML += `<div><span class="hl-arrow">➜</span> Upgrade: ${upgrade_str}${other_tokens}</div>`;

                            let current_state_arr = [];
                            for (let i = 0; i < upgrades; i++) current_state_arr.push(`∞${sign}`);
                            if (inf_pow > 0) current_state_arr.push(`∞${sign.repeat(inf_pow)}`);
                            if (rem_ones > 0) current_state_arr.push(`1${sign.repeat(rem_ones)}`);

                            runHTML += `<div><span class="hl-arrow">➜</span> Output: <span class="hl-result">${current_state_arr.map(s => formatToken(s, 200)).join(" ")}</span></div>`;

                            if (inf_pow > 0 || upgrades > 1) {
                                let final_fuse_arr = [];
                                for (let i = 0; i < upgrades; i++) final_fuse_arr.push(`∞${sign}`);
                                if (inf_pow > 0) final_fuse_arr.push(`∞${sign.repeat(inf_pow)}`);

                                runHTML += `<div><span class="hl-arrow">➜</span> Fuse: <span class="hl-fuse">[${final_fuse_arr.map(s => formatToken(s, 200)).join(" ")}]</span></div>`;

                                let total_inf = inf_pow + upgrades;
                                let final_stack = [];
                                if (total_inf > 0) final_stack.push(`∞${sign.repeat(total_inf)}`);
                                if (rem_ones > 0) final_stack.push(`1${sign.repeat(rem_ones)}`);

                                runHTML += `<div><span class="hl-arrow">➜</span> Output: <span class="hl-result">${final_stack.map(s => formatToken(s, 200)).join(" ")}</span></div>`;
                                eq = final_stack;
                            } else {
                                eq = current_state_arr;
                            }
                        } else {
                            eq = fused;
                        }

                        let final_inf = eq.filter(t => t.charAt(0) === '∞');
                        let final_one = eq.filter(t => t.charAt(0) === '1');
                        eq = [...final_inf, ...final_one];

                        runHTML += `<div style="margin-top: 10px;"><span class="hl-arrow">■</span> Final Stack: <span class="hl-final">${eq.map(s => formatToken(s, 200)).join(" ")}</span></div>`;
                        break;
                    }
                    loops++;
                }

                if (eq.length === 1 && loops === 0) {
                    runHTML += `<div><span class="hl-arrow">■</span> Final Stack: <span class="hl-final">${eq.map(s => formatToken(s, 200)).join(" ")}</span></div>`;
                }

                runHTML += `</div>`;

                fullTraceHTML += runHTML;
                $("#traceContent").html(fullTraceHTML);

                if (eq.length > 0) {
                    // LIMIT 20 FOR FINAL RESULT
                    let final_html = eq.map(sym => `<span class="${getTextClass(sym)}" style="font-size: 38px;">${formatToken(sym, 2)}</span>`).join(" ");
                    $("#finalResult").html(final_html);
                }
            });

            $("#clearBtn").click(() => {
                baseEquation = [];
                fullTraceHTML = "";
                updateLiveInputDisplay();
                $("#traceContent").html('<div class="empty-log">System Purged. Ready for new sequence.</div>');
                $("#finalResult").text("--");
                $(".inps").val(1);
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
    