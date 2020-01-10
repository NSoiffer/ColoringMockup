// @ts-check
/* -*- Mode: Java; tab-width: 4; indent-tabs-mode:nil; c-basic-offset: 4 -*- */
/* vim: set ts=4 et sw=4 tw=80: */

class Color {
    // A general definition of a color object
    /**
     * 
     * @param {string} cssColor   // or encoding name
     * @param {number} [c1]         // first part of rgb or hsa (number or %)
     * @param {number} [c2]         // second...
     * @param {number} [c3]         // third...
     */
    constructor(cssColor, c1, c2, c3) {
        cssColor = cssColor.toLowerCase();
        if (arguments.length > 1) {
            if (cssColor !== 'rgb') {
                this.setHSLValues(c1, c2, c3);
            } else {
                this.setRGBValues(c1, c2, c3);
                if (cssColor !== 'rgb') {
                    console.log(`unknown color type: ${cssColor}`);
                }
            }
            return;
        }

        // dealing with a string
        let components = cssColor.match(/rgb\((\d+%?), *(\d+%?), *(\d+%?)\)/);
        if (components) {
            this.setRGBValues(components[1], components[2], components[3]);
            return;
        }
        components = cssColor.match(/hsl\((\d+%?), *(\d+%?), *(\d+%?)\)/);
        if (components) {
            this.setHSLValues(components[1], components[2], components[3]);
            return;
        }
        components = cssColor.match(/#([0-9a-f][0-9a-f])([0-9a-f][0-9a-f])([0-9a-f][0-9a-f])/);
        if (!components) {
            components = cssColor.match(/#([0-9a-f])([0-9a-f])([0-9a-f])/);
            if (components) {
                components[2] += components[2];  // double up each character
                components[3] += components[3];  // double up each character
                components[4] += components[4];  // double up each character
            }
        }
        if (components) {
            this.setRGBValues(parseInt(components[1], 16), parseInt(components[2], 16), parseInt(components[3], 16));
        } else {
            // assume black
            this.setRGBValues(255, 255, 255);
        }
    }

    /**
     * Makes sure 'val is between min and max, rounds to an int, and deals with %s (% of max)
     * @param {string|number} val 
     * @param {number} min 
     * @param {number} max 
     * @returns {number}
     */
    standardize(val, min, max) {
        if (typeof val === 'string') {
            val = parseInt(val);
        }
        return Math.round( Math.max(min, Math.min(max, val)) );
    }

    /**
     * 
     * @param {string|number} h 
     * @param {string|number} s 
     * @param {string|number} l 
     */
    setHSLValues(h, s, l) {
        this.enc = 'hsl';
        this.c1 = this.standardize(h, 0, 360);
        this.c2 = this.standardize(s, 0, 100);
        this.c3 = this.standardize(l, 0, 100);    
    }

    /**
     * 
     * @param {string|number} r 
     * @param {string|number} g 
     * @param {string|number} b 
     */
    setRGBValues(r, g, b) {
        this.enc = 'rgb';
        this.c1 = this.standardize(r, 0, 255);
        this.c2 = this.standardize(g, 0, 255);
        this.c3 = this.standardize(b, 0, 255);    
    }

    /**
     * 
     * @param {'hsl'|'rgb'|'hex'} colorType  ()
     * @returns {string}
     */
    toCSSColor(colorType) {
        if (colorType === 'hsl') {
            if (this.enc == 'hsl') {
                return `hsl(${this.c1}, ${this.c2}%, ${this.c3}%)`;
            } else {
                return this.toHSL().toCSSColor(colorType);
            }
        } else {
            if (this.enc == 'rgb') {
                if (colorType === 'rgb') {
                    return `rgb(${this.c1}, ${this.c2}, ${this.c3})`;
                } else {
                    // colorType === 'hex'
                    /**
                     * @param {number} num 
                     */
                    function make2Chars(num) {
                        return (num < 16 ? '0' : '') + num.toString(16);
                    }
                    return '#' + make2Chars(this.c1) + make2Chars(this.c2) + make2Chars(this.c3);
                }
            } else {
                return this.toRGB().toCSSColor(colorType);
            }
        }
    }


    /*
    * The following conversion functions are taken from
    *    https://github.com/ui-js/chromatic/blob/master/src/value.ts
    * and modified for this class
    */

    /**
     * 
     * @param {number} t1 
     * @param {number} t2 
     * @param {number} hue 
     * @returns {number}
     */
    hueToRgbChannel(t1, t2, hue) {
        if (hue < 0) hue += 6;
        if (hue >= 6) hue -= 6;

        if (hue < 1) return (t2 - t1) * hue + t1;
        else if (hue < 3) return t2;
        else if (hue < 4) return (t2 - t1) * (4 - hue) + t1;
        else return t1;
    }

    /**
     * 
     * @returns {Color}
     */
    toRGB() {
        if (this.enc === 'rgb') {
            return this;
        }
        
        let hue = ((this.c1 + 360) % 360) / 60.0;
        let light = Math.max(0, Math.min(this.c3/100.0, 1.0));
        let sat = Math.max(0, Math.min(this.c2/100.0, 1.0));
        const t2 = light <= 0.5 ? light * (sat + 1) : light + sat - light * sat;
        const t1 = light * 2 - t2;
        return new Color(
            'rgb',
            Math.round(255 * this.hueToRgbChannel(t1, t2, hue + 2)),
            Math.round(255 * this.hueToRgbChannel(t1, t2, hue)),
            Math.round(255 * this.hueToRgbChannel(t1, t2, hue - 2))
        );
    }

    /**
     * 
     * @returns {Color}
     */
    toHSL() {

        if (this.enc === 'hsl') {
            return this;
        }

        let r = this.c1 / 255;
        let g = this.c2 / 255;
        let b = this.c3 / 255;
        const min = Math.min(r, g, b);
        const max = Math.max(r, g, b);

        const delta = max - min;
        let h;
        let s;

        if (max === min) {
            h = 0;
        } else if (r === max) {
            h = (g - b) / delta;
        } else if (g === max) {
            h = 2 + (b - r) / delta;
        } else if (b === max) {
            h = 4 + (r - g) / delta;
        }

        h = Math.min(h * 60, 360);

        if (h < 0) {
            h += 360;
        }

        const l = (min + max) / 2;

        if (max === min) {
            s = 0;
        } else if (l <= 0.5) {
            s = delta / (max + min);
        } else {
            s = delta / (2 - max - min);
        }

        return new Color('hsl', h, 100*s, 100*l);
    }

    /**
     * @returns {number}
     */
    luma() {
        if (this.enc !== 'rgb') {
            return this.toRGB().luma();
        }

       // Source: https://www.w3.org/TR/WCAG20/#relativeluminancedef
       let r = this.c1 / 255.0;
       let g = this.c2 / 255.0;
       let b = this.c3 / 255.0;
       r = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
       g = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
       b = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

       return 0.2126 * r + 0.7152 * g + 0.0722 * b;     
    }

    /**
     * 
     * @param {Color} dark 
     * @param {Color} light
     * @returns {Color}
     */
    contrast(dark, light) {
        // See https://www.w3.org/TR/WCAG20/#contrast-ratiodef for contrast rations calc
        // Requirement is that it should exceed 4.5:1 for AA, 7:1 for AAA
        const base = this.toHSL();
        dark = dark.toHSL();
        light = light.toHSL();

        let darkContrast, lightContrast;
        const baseLuma = base.luma();
        const darkLuma = dark.luma();
        const lightLuma = light.luma();
        if (baseLuma > darkLuma) {
            darkContrast = (baseLuma + 0.05) / (darkLuma + 0.05);
        } else {
            darkContrast = (darkLuma + 0.05) / (baseLuma + 0.05);
        }
        if (baseLuma > lightLuma) {
            lightContrast = (baseLuma + 0.05) / (lightLuma + 0.05);
        } else {
            lightContrast = (lightLuma + 0.05) / (baseLuma + 0.05);
        }

        return darkContrast > lightContrast ? dark : light;
    }

    /**
     * 
     * @param {Color} mixColor 
     * @param {number} weight       // weighting of mixColor -should be between 0 and 1
     */
    mixColor(mixColor, weight) {
        // @todo: support additional color models. See color-convert npm module.
        const color1 = this.toHSL();
        const color2 = mixColor.toHSL();    
        return new Color('hsl',
            color1.c1 + (color2.c1 - color1.c1) * weight,
            color1.c2 + (color2.c2 - color1.c2) * weight,
            color1.c3 + (color2.c3 - color1.c3) * weight,
        );
    }
    
    /**
     * @returns {[Color, Color]}    
     */
    scaleColor() {
        // For an analysis of various ramps, see https://uxplanet.org/designing-systematic-colors-b5d2605b15c
        let color1 = new Color('hsl', 0, 0, 100); // white
        let color2 = this.toHSL();
        let color3 = new Color('hsl',
            // Correct the hue for the Abney Effect
            // See https://royalsocietypublishing.org/doi/pdf/10.1098/rspa.1909.0085
            // (the human vision system perceives a hue shift as colors
            // change in colorimetric purity (mix with black or mix
            // with white))
            // and the Bezold-Brücke effect (hue shift as intensity increases)
            // See https://www.sciencedirect.com/science/article/pii/S0042698999000851

            // h: c2.h >= 60 && c2.h <= 240 ? c2.h + 30 : c2.h - 30,
            color2.c1 - 20 * Math.sin(4 * Math.PI * (color2.c1 / 360)),
            color2.c2 + 20 * Math.sin(2 * Math.PI * (color2.c1 / 360)),
            color2.c1 >= 180
                    ? color2.c3 - 35
                    : color2.c3 - 20 + 10 * Math.sin(4 * Math.PI * (color2.c1 / 360)),
        );

        return [color1.mixColor(color2, 0.15), color3.mixColor(color2, 0.15)]; // lower numbers => more contrast
    }
    
    /**
     * @returns [Color Color]   // [foreground, background]
     */
    toComplementary() {
        // complement the bg, get light and dark fg colors from scalerColor(), then get contrasting color
        const complementaryBackground = this.toHSL();
        complementaryBackground.c1 = (complementaryBackground.c1 + 180) % 360;
        const [light, dark] = complementaryBackground.scaleColor();
        const matchingForegound = complementaryBackground.contrast(dark, light);
        return [matchingForegound, complementaryBackground]
    }
}

class ColorRule {
    /**
     * 
     * @param {string} pattern 
     * @param {string|Color} fgColor
     * @param {string|Color} bgColor 
     * @param {string} style 
     * @param {string} spacing 
     */
    constructor(pattern, fgColor, bgColor, style, spacing) {
        this.pattern = new RegExp(pattern);
        this.fgColor = fgColor ? (typeof fgColor === 'string' ? new Color(fgColor) : fgColor) : null;
        this.bgColor = bgColor ? (typeof bgColor === 'string' ? new Color(bgColor) : bgColor) : null;
        this.style = style;
        this.spacing = spacing;
    }

    /**
     * 
     * @returns {string}
     */
    buildSpanStyle() {
        let style = '';
        if (this.fgColor) {
            style += ` color: ${this.fgColor.toCSSColor('hex')};`;
        }
        if (this.bgColor) {
            style += ` background-color: ${this.bgColor.toCSSColor('hex')};`;
        }
        if (this.style) {
            let css = this.style.toLowerCase() === 'bold' ? 'font-weight' : 'font-style';
            style += ` ${css}: ${this.style};`;
        };
        if (this.spacing) {
            style += ` margin-left: ${this.spacing}; margin-right: ${this.spacing};`
        }
        return style;
    }

}


class ColoringRules {
    constructor() {
        /** @type {ColorRule[]} */
        this.patterns = [];
    }

    /**
     * @returns {ColoringRules}
     */
    clone() {
        let newRules = new ColoringRules();
        newRules.patterns = Object.assign([], this.patterns);
        return newRules;
    }

    /**
     * @returns {ColoringRules}
     */
    initialize() {
        this.patterns.push( new ColorRule('3', 'hsl(130, 70%, 43%)', 'hsl(4, 90%, 50%)', 'normal', '') );
        this.patterns.push( new ColorRule('8', 'hsl(4, 90%, 50%)', 'hsl(130, 70%, 43%)', 'normal', '') );
        this.patterns.push( new ColorRule('[0-9]', '', '', 'normal', '') );
        this.patterns.push( new ColorRule('[a-zA-Z]', '', '', 'italic', '') );
        this.patterns.push( new ColorRule('\\+|×|÷|±', '', '', 'normal', '.222em') );
        this.patterns.push( new ColorRule('-', '', '', 'bold', '.222em') );
        this.patterns.push( new ColorRule('\\|', '', '', 'bold', '') );
        this.patterns.push( new ColorRule('<|=|>|≠|≤|≥', 'hsl(0,0%,100%)', 'hsl(160, 10%, 10%)', 'normal', '.278em') );
        return this;
    }

    /**
     * Returns a string with the special reg exp chars escaped so it can be used as a literal search string
     * @param {string} ch // should be a single character
     * @returns {string}
     */
    escapeSpecialChars(ch) {
        return ch.replace(/[(\\\^\$\.\|\?\*\+\(\)\[\{)]/g, '\\$&');
    }
    /** 
     * @param {string} ch // should be a single character
     * @returns {ColorRule}
     */
    match(ch) {
        return this.patterns.find( colorRule => colorRule.pattern.test(this.escapeSpecialChars(ch)) );
    }

    /**
     * Replaces 'ch' in patterns; if not present, adds it
     * @param {string} ch 
     * @param {ColorRule} rule 
     */
    replace(ch, rule) {
        const regExForCh = new RegExp( this.escapeSpecialChars(ch) );
        const i = this.patterns.findIndex( p => p.pattern == regExForCh);
        if (i >= 0) {
            this.patterns[i] = rule;
        } else {
            this.patterns.unshift(rule);        // put at start so it matches before any builtin patterns
        }
    }

    /**
     * Adds the new rules to the old ones (this) -- new ones first (or replacing old ones)
     * A clone of 'this' is made ('this' is not changed)
     * @param {ColoringRules} newRules  (not changed)
     * @returns {ColoringRules} 
     */
    merge(newRules) {
        let clone = this.clone();
        for (const rule of newRules.patterns) {
            clone.replace(rule.pattern.source, rule);
        }
        return clone;
    }

    /** 
     * @param {string} str // should be a single character
     * @returns {string}
     */
    convertToSpan(str) {
        let result = '';
        for (const ch of str) {
            const colorRule = this.match(ch);
            let spanStyle = colorRule ? colorRule.buildSpanStyle() : '';
            result += `<span style="${spanStyle}">${ch}</span>`;
        }
        return result;
    }

    updatePalettes() {
        for (const palette of PaletteIds) {
            const buttons = document.getElementById(palette).getElementsByTagName('button');
            for (const button of buttons) {
                button.innerHTML = this.convertToSpan(button.innerText);
            }
        }
    }

    updateAll() {
        this.updatePalettes();

        const testArea = document.getElementById('test-input');
        testArea.innerHTML = this.convertToSpan(testArea.innerText);
    }
}

// The global (permantent) instance of coloring rules
ColoringRules.Rules = new ColoringRules().initialize();

/**
 * This is added to avoid having lots of "type" errors when accessing the input fields
 * @param {string} id 
 * @returns {HTMLInputElement}
 */
function getInputElement(id) {
    // @ts-ignore
    return document.getElementById(id);
}

const EditAreaIds = ['edit-input', 'text-color', 'bg-color', 'font-style', 'spacing'];
const PaletteIds = ['lc-letters', 'uc-letters', 'digits', 'symbols', 'symbols-test']
window.onload =
    function() {
        // add the palettes
        PaletteIds.forEach( palette => addCharacterPalette(document.getElementById(palette)) );

        let testInput = document.getElementById('test-input');
        testInput.addEventListener('keydown', updateTestArea);

        let editInputArea = document.getElementById('edit-input');
        editInputArea.addEventListener('keydown', updateTestArea);
        let oppositeEditArea = document.getElementById('opposite-input');
        /** @type{HTMLInputElement} */
        // @ts-ignore
        let oppositeInputEditArea = oppositeEditArea.firstElementChild;
        oppositeEditArea.addEventListener('input', function() {
            const editAreaRules = gatherCharStyle(editInputArea);
            const complementaryRules = getComplimentaryRules(oppositeInputEditArea.value, editAreaRules.patterns[0]);   
            ColoringRules.Rules.merge( complementaryRules.merge(editAreaRules) ).updateAll();
        });

        EditAreaIds.forEach(
            id => document.getElementById(id).addEventListener('input', updateCharStyle));
            
            document.getElementById('change').addEventListener('mousedown', function() {
                const editAreaRules = gatherCharStyle(editInputArea);
                const complementaryRules = getComplimentaryRules(oppositeInputEditArea.value, editAreaRules.patterns[0]);   
                ColoringRules.Rules = ColoringRules.Rules.merge( complementaryRules.merge(editAreaRules) );
                ColoringRules.Rules.updateAll();
                editInputArea.innerText = '';   // clear the work area input
                oppositeInputEditArea.value = '';
            });
            document.getElementById('cancel').addEventListener('mousedown', function() {
                ColoringRules.Rules.updateAll();
                editInputArea.innerText = '';   // clear the work area input
                oppositeInputEditArea.value = '';
            });

        // useful for demo at the moment to have some initial contents
        testInput.innerHTML = ColoringRules.Rules.convertToSpan(testInput.textContent);
    };

/**
 * 
 * @param {HTMLElement} grid 
 */
function addCharacterPalette(grid) {
    const chars = grid.textContent;
    grid.textContent = '';
    chars.split('').forEach( function(char) {
        let button = document.createElement('button');
        button.className = 'button';
        button.innerHTML = ColoringRules.Rules.convertToSpan(char);
        button.onclick = /test/.test(grid.id) ? copyCharToTestArea : copyCharToEditArea;
        grid.appendChild(button);
    } );
}


/**
 * 
 * @param {MouseEvent} ev 
 */
function copyCharToTestArea(ev) {
    ev.preventDefault();
    // @ts-ignore
    document.execCommand('insertHTML', false, ColoringRules.Rules.convertToSpan(ev.target.innerText));
}

/**
 * 
 * @param {MouseEvent} ev 
 */
// @ts-ignore
function copyCharToEditArea(ev) {
    let editInputArea = document.getElementById('edit-input');
    if (editInputArea.innerText) {
        if (confirm('Your changes to the character have not been saved.\nClick "ok" to save the changes and "cancel" to discard the changes')) {
            ColoringRules.Rules = ColoringRules.Rules.merge(gatherCharStyle(editInputArea));
        }
        ColoringRules.Rules.updateAll();
    }
    editInputArea.innerHTML = ColoringRules.Rules.convertToSpan(this.innerText);

    // update the edit area fields
    // @ts-ignore
    let targetStyle = editInputArea.children[0]. style;
    // @ts-ignore
    document.getElementById('text-color').value = targetStyle.color ? new Color(targetStyle.color).toCSSColor('hex') : '#000000';
    // @ts-ignore
    document.getElementById('bg-color').value = targetStyle.backgroundColor ? new Color(targetStyle.backgroundColor).toCSSColor('hex') : '#ffffff';
    // @ts-ignore
    document.getElementById('font-style').value = targetStyle.fontStyle ? targetStyle.fontStyle : 
                                                  targetStyle.fontWeight ? targetStyle.fontWeight : 'normal';
    // @ts-ignore
    document.getElementById('spacing').value = targetStyle.marginLeft ? targetStyle.marginLeft : '0em';
}

/**
 * 
 * @param {KeyboardEvent} e 
 */
function updateTestArea(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) {
        return true;
    }
    if (e.key.length === 1) {
        e.preventDefault();
        document.execCommand('insertHTML', false, ColoringRules.Rules.convertToSpan(e.key));
        if (/<br/.test(document.getElementById('test-input').innerHTML)) {
            // for reasons I haven't been able to figure out, sometimes <br> gets inserted also (not by this code)
            // at least it does in Chrome (not in Firefox AFAIK)
            // this pulls it back out
            document.execCommand('forwardDelete', false, null);
        }
    }
}

/**
 * @param {HTMLElement} elementForChar
 * @returns {ColoringRules} 
 */
function gatherCharStyle(elementForChar) {
    // @ts-ignore '.value' is issue
    const ruleValues = EditAreaIds.slice(1).map(  id => document.getElementById(id).value);

    // create a rule based on those values and *add* it to a temporary set of rules
    let newRules = new ColoringRules();
    let text = elementForChar.innerText ? elementForChar.innerText : '\uffff';  // use char that can't be typed

    for (const ch of text.split('')) {      // for loop because there could be more than one char
        // @ts-ignore
        const newRule = new ColorRule( ...[newRules.escapeSpecialChars(ch)].concat(ruleValues) );    
        newRules.replace(ch, newRule);
    }
    return newRules;
}

/**
 * 
 * @param {string} chars       // could be more than one character
 * @param {ColorRule} colorRule
 * @returns {ColoringRules}
 */
function getComplimentaryRules(chars, colorRule) {
    const bgColor = colorRule.bgColor ? colorRule.bgColor.toHSL() : new Color('hsl', 0, 0, 100) /* white */
    let [compForeground, compBackground] = bgColor.toComplementary();

    chars = chars || '\uffff';  // safe value to use since it will never match anything
    let result = new ColoringRules()
    for (const ch of chars) {
        result.replace(ch, new ColorRule(ch, compForeground, compBackground, colorRule.style, colorRule.spacing));
    }

    return result;
}

/**
 * 
 * @param {Event} e 
 */
function updateCharStyle(e) {
    // gather up all the values that were set
    const elementForChar = document.getElementById('edit-input')
    const editAreaRules = gatherCharStyle(elementForChar);

    const oppositeEditArea = document.getElementById('opposite-input');
    // @ts-ignore
    let complementaryRules = getComplimentaryRules(oppositeEditArea.firstElementChild.value, editAreaRules.patterns[0]);

    const tempColoringRules = ColoringRules.Rules.merge( complementaryRules.merge(editAreaRules) );
    // @ts-ignore
    if (typeof e.inputType !== 'undefined') {
        // typing directly in the field
        e.preventDefault();
        document.execCommand('insertHTML', false, ColoringRules.Rules.convertToSpan(elementForChar.innerText));
    } else {
        // change of values
        elementForChar.innerHTML = tempColoringRules.convertToSpan(elementForChar.innerText);
    }

    tempColoringRules.updateAll();
    
    oppositeEditArea.style.color = complementaryRules.patterns[0].fgColor.toCSSColor('hsl');
    oppositeEditArea.style.backgroundColor = complementaryRules.patterns[0].bgColor.toCSSColor('hsl');    
}
