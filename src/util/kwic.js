export function kwicText(str, start, end, words = 3) {
    let p0 = start - 1;
    let count = 0;
    while (p0 >= 0) {
        if (/[\p{P}\s]/.test(str.charAt(p0))) {
            while (p0 > 1 && /[\p{P}\s]/.test(str.charAt(p0 - 1))) {
                p0 -= 1;
            }
            count += 1;
            if (count === words) {
                break;
            }
        }
        p0 -= 1;
    }
    let p1 = end + 1;
    count = 0;
    while (p1 < str.length) {
        if (/[\p{P}\s]/.test(str.charAt(p1))) {
            while (p1 < str.length - 1 && /[\p{P}\s]/.test(str.charAt(p1 + 1))) {
                p1 += 1;
            }
            count += 1;
            if (count === words) {
                break;
            }
        }
        p1 += 1;
    }
    return `&#8230; ${str.substring(p0, start)}<mark>${str.substring(start, end)}</mark>${str.substring(end, p1 + 1)} &#8230;`;
}
