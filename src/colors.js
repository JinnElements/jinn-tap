// Convert hex to HSL for easier manipulation
const hexToHSL = (hex) => {
    let r = parseInt(hex.substring(1,3), 16) / 255;
    let g = parseInt(hex.substring(3,5), 16) / 255; 
    let b = parseInt(hex.substring(5,7), 16) / 255;

    let max = Math.max(r, g, b);
    let min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0;
    } else {
        let d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch(max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return [h * 360, s * 100, l * 100];
};

// Convert HSL back to hex
const hslToHex = (h, s, l) => {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = n => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
};

export function colorCssFromSchema(schema) {
    // Generate CSS variables for schema elements that need colors
    const baseColor = '#E48500';
    const colorVariables = {};
    const cssStyles = [];
    
    // Get base HSL values
    const [baseH, baseS, baseL] = hexToHSL(baseColor);
    
    // Generate colors with different hues
    // Generate colors for nested divs (up to 5 levels)
    const divColors = [];
    for (let i = 0; i < 5; i++) {
        const hue = (baseH + (i * 40)) % 360;
        const color = hslToHex(hue, baseS, baseL);
        colorVariables[`--tei-div-color-${i}`] = color;
    }
    let inlineCount = 5;
    Object.entries(schema.schema).forEach(([name, def]) => {
        const hue = (baseH + (inlineCount * 60)) % 360;
        const color = hslToHex(hue, baseS, baseL);
        colorVariables[`--tei-${name}-color`] = `${color}`;

        if (def.type === 'inline' || def.type === 'empty') {
            cssStyles.push(`
                .debug tei-${name}::after { 
                    background-color: var(--tei-${name}-color);
                    content: "${name}";
                }
            `);
        }
        inlineCount++;
    });

    return `
        :root {
            ${Object.entries(colorVariables).map(([key, value]) => `${key}: ${value};`).join('\n')}
        }
        
        ${cssStyles.join('\n')}
    `;
}

export function generateRandomColor() {
    const baseColor = '#E48500';
    
    // Get base HSL values
    const [baseH, baseS, baseL] = hexToHSL(baseColor);
    
    // Generate a random hue offset between 0 and 360
    const randomHue = (baseH + Math.random() * 360) % 360;
    
    // Return a color with the same saturation and lightness as the base color
    return hslToHex(randomHue, baseS, baseL);
}