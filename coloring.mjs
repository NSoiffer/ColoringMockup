// @ts-check
/* -*- Mode: Java; tab-width: 4; indent-tabs-mode:nil; c-basic-offset: 4 -*- */
/* vim: set ts=4 et sw=4 tw=80: */

const DEFAULT_RULE_NAME = 'default coloring rules';
const STORAGE_NAME__STARTUP_COLORING_RULES = 'ColoringRulesStartupRuleName';
const VERSION = '0.2';

/**************
 * RegExp doesn't stringify by default. We add the method here
 *************************/
Object.defineProperty(RegExp.prototype, "toJSON", {
    value: RegExp.prototype.toString
});



class Color {
    // A general definition of a color object
    // FIX: currently not supporting an alpha channel, but do want to support 'transparent'.
    // FIX:  to do this, we highjack rgb(255, 255, 254) and make it transparent and vice-versa when needed
    /**
     * 
     * @param {string} cssColor     // or encoding name
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

    clone() {
        return new Color(this.enc, this.c1, this.c2, this.c3);
    }

    /**
     * 
     * @param {Object} obj 
     * @returns {Color}
     */
    static readJSON(obj) {
        return obj ? new Color(obj.enc, obj.c1, obj.c2, obj.c3) : null;
    }


    isTransparent() {
        return this.enc === 'rgb' && this.c1 === 255 && this.c2 === 255 && this.c3 === 254;
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
        return Math.round(Math.max(min, Math.min(max, val)));
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
     * @param {'hsl'|'rgb'|'hex'|'hexa'} colorType  ()
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
                    // colorType === 'hex' or 'hexa'
                    /**
                     * @param {number} num 
                     */
                    function make2Chars(num) {
                        return (num < 16 ? '0' : '') + num.toString(16);
                    }
                    return (colorType === 'hexa' && this.isTransparent()) ? '#ffffff00' : '#' + make2Chars(this.c1) + make2Chars(this.c2) + make2Chars(this.c3);
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
        let light = Math.max(0, Math.min(this.c3 / 100.0, 1.0));
        let sat = Math.max(0, Math.min(this.c2 / 100.0, 1.0));
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

        if (this.enc === 'hsl' || this.enc === 'transparent') {
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

        return new Color('hsl', h, 100 * s, 100 * l);
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
     * @param {number} contrast     // lower numbers => more contrast
     * @returns {[Color, Color]}    
     */
    scaleColor(contrast) {
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

        return [color1.mixColor(color2, contrast), color3.mixColor(color2, contrast)];
    }

    /**
     * @returns [Color Color]   // [foreground, background]
     */
    toComplementary() {
        // complement the bg, get light and dark fg colors from scalerColor(), then get contrasting color
        const complementaryBackground = this.toHSL();
        complementaryBackground.c1 = (complementaryBackground.c1 + 180) % 360;
        const [light, dark] = complementaryBackground.scaleColor(0.15);
        const matchingForegound = complementaryBackground.contrast(dark, light);
        return [matchingForegound, complementaryBackground]
    }
}

Color.White = new Color('#FFFFFF');
Color.Black = new Color('#000000');
Color.Transparent = new Color('#FFFFFE'); // hack to indicate transparent

/**
 * @param{string} str
 * @returns {RegExp}
 */
function RegExpFromPatternString(str) {
    if (str.length > 2 && str[0] === '/' && str[str.length - 1] === '/') {
        str = str.slice(1, -1);
    }
    return new RegExp(str);
}

class ColorRule {
    /**
     * 
     * @param {string|RegExp} pattern 
     * @param {string|Color} fgColor        // can be null
     * @param {string|Color} bgColor        // can be null
     * @param {string} style 
     * @param {string} spacing 
     */
    constructor(pattern, fgColor, bgColor, style, spacing) {
        this.pattern = typeof pattern === 'string' ? RegExpFromPatternString(ColoringRules.escapeSpecialChars(pattern)) : pattern;
        this.fgColor = fgColor ? (typeof fgColor === 'string' ? new Color(fgColor) : fgColor) : Color.Black;
        this.bgColor = bgColor ? (typeof bgColor === 'string' ? new Color(bgColor) : bgColor) : Color.Transparent;
        this.style = style;
        this.spacing = spacing;
    }

    /**
     * 
     * @param {Object} obj 
     * @returns {ColorRule}
     */
    static readJSON(obj) {
        return obj ? new ColorRule(
            obj.pattern,
            Color.readJSON(obj.fgColor),
            Color.readJSON(obj.bgColor),
            obj.style,
            obj.spacing)
            : null;
    }

    clone() {
        return new ColorRule(this.pattern,
                             this.fgColor ? this.fgColor.clone() : null,
                             this.bgColor ? this.bgColor.clone() : null,
                             this.style,
                             this.spacing);
    }


    /**
     * 
     * @returns {string}
     */
    buildSpanStyle() {
        let style = '';
        if (this.fgColor) {
            style += ` color: ${this.fgColor.toCSSColor('hexa')};`;
        }
        if (this.bgColor) {
            style += ` background-color: ${this.bgColor.toCSSColor('hexa')};`;
        }
        if (this.style) {
            let css = this.style.toLowerCase() === 'bold' || this.style.toLowerCase() === 'bolder' ?
                'font-weight' : 'font-style';
            style += ` ${css}: ${this.style.toLowerCase()};`;
        };
        if (this.spacing) {
            style += ` margin-left: ${this.spacing}; margin-right: ${this.spacing};`
        }
        return style;
    }
}

class MatchColor {
    /**
     * 
     * @param {string|Color} fgParenColor           // can be null
     * @param {string|Color} bgParenColor           // can be null
     * @param {boolean} includeParens 
     * 
     * @param {string|Color} bgInsideColor          // can be null
     * @param {string} borderPosition               // none, top, bottom, all
     * @param {string} borderThickness              // value to use is stored, not label
     * @param {string|Color} borderColor 
     */
    constructor(fgParenColor, bgParenColor, includeParens,
                bgInsideColor, borderPosition, borderThickness, borderColor) {
        this.fgParenColor = fgParenColor ? (typeof fgParenColor === 'string' ? new Color(fgParenColor) : fgParenColor) : Color.Black;
        this.bgParenColor = bgParenColor ? (typeof bgParenColor === 'string' ? new Color(bgParenColor) : bgParenColor) : Color.Transparent;
        this.includeParens = includeParens;

        this.bgInsideColor = bgInsideColor ? (typeof bgInsideColor === 'string' ? new Color(bgInsideColor) : bgInsideColor) : Color.Transparent;
        this.borderPosition = borderPosition;
        this.borderThickness = borderThickness;
        this.borderColor = typeof borderColor === 'string' ? new Color(borderColor) : borderColor;
    }

    clone() {
        return new MatchColor(this.fgParenColor.clone(), this.bgParenColor.clone(), this.includeParens,
                              this.bgInsideColor.clone(), this.borderPosition, this.borderThickness, this.borderColor.clone());
    }

    /**
     * 
     * @param {Object} obj 
     * @returns {MatchColor}
     */
    static readJSON(obj) {
        return obj ? new MatchColor(
            Color.readJSON(obj.fgParenColor),
            Color.readJSON(obj.bgParenColor),
            obj.includeParens,

            Color.readJSON(obj.bgInsideColor),
            obj.borderPosition,
            obj.borderThickness,
            Color.readJSON(obj.borderColor))
            : null;
    }

    /**
     * @param{string} [nested]   // if present, this is a nested span
     * @returns {string}
     */
    buildSpanStyle(nested) {
        let style = '';
        nested='nested';
        if (nested) {
            style += ` margin-top: 3px; margin-bottom: 3px;`
        }
        if (this.bgInsideColor) {
            style += ` background-color: ${this.bgInsideColor.toCSSColor('hex')};`;
        }
        switch (this.borderPosition) {
            case 'Above':
                style += ' border-top-style: solid;';
                break;
            case 'Below':
                style += ' border-bottom-style: solid;';
                break;
            case 'Box':
                style += ' border-style: solid;';
                break;
            default:
                style += 'border-style: none;';
                break;
        }

        style += ` border-width: ${this.borderThickness};`;
        style += ` border-color: ${this.borderColor.toCSSColor('hex')};`;
        return style;
    }

    /**
     * @param {Element} matchArea
     * @param {number} i // first, second, ... rule (0-based)
     */
    static buildMatchColor(matchArea, i) {
        // update the MatchColor associated with 'index'
        const matchColor = new MatchColor(
            getInputElement(matchArea, ".match-paren-fg").value,
            getInputElement(matchArea, ".match-paren-bg").value,
            getInputElement(matchArea, ".match-parens-include").checked,

            getInputElement(matchArea, ".match-contents-bg").value,
            getInputElement(matchArea, ".border-style").value,
            getInputElement(matchArea, ".border-thickness").value,
            getInputElement(matchArea, ".border-color").value
            );

        const testStringElement = matchArea.querySelector(".match-area-test");
        const limitedColoringRules = new ColoringRules();
        limitedColoringRules.matches = [matchColor];         // only want to color match things
        testStringElement.innerHTML = limitedColoringRules.convertToSpan(testStringElement.textContent);
        return matchColor;
    }
}


/**
 * This class is used when a start/end pair wants to be colored.
 * The open/close chars at the top level are colored in the standard manner.
 * This supports a different coloring when nested [FIX: extend this to multiple levels???]
 * In addition to different colorings for the open/close, *both* the toplevel and nested matching area supports:
 * 1. a background color
 * 2. a border (could just be a top line) with the styling for linethickness and color
 */
class MatchingColorRule {
    /**
     * 
     * @param {ColorRule} nestedOpenColorRule 
     * @param {ColorRule} nestedCloseColorRule 
     * @param {MatchColor} topMatchColor 
     * @param {MatchColor} nestedMatchColor 
     */
    constructor(nestedOpenColorRule, nestedCloseColorRule, topMatchColor, nestedMatchColor) {
        this.nestedOpenColorRule = nestedOpenColorRule;
        this.nestedCloseColorRule = nestedCloseColorRule;
        this.topMatchColor = topMatchColor;
        this.nestedMatchColor = nestedMatchColor;
    }

    /**
     * @returns {MatchingColorRule}
     */
    clone() {
        return new MatchingColorRule(this.nestedOpenColorRule.clone(), this.nestedCloseColorRule.clone(),
            this.topMatchColor.clone(), this.nestedMatchColor.clone());
    }

    /**
     * 
     * @param {Object} obj 
     * @returns {MatchingColorRule}
     */
    static readJSON(obj) {
        return obj ? new MatchingColorRule(
            ColorRule.readJSON(obj.nestedOpenColorRule),
            ColorRule.readJSON(obj.nestedCloseColorRule),
            MatchColor.readJSON(obj.topMatchColor),
            MatchColor.readJSON(obj.nestedMatchColor))
            : null;
    }
}


class ColoringRules {
    /**
     * 
     * @param {string} name 
     */
    constructor(name) {
        this.name = name;
        /** @type {ColorRule[]} */
        this.patterns = [];
        /** @type {MatchColor[]} */
        this.matches = [];
    }

    /**
     * 
     * @param {Object} obj 
     * @returns {ColoringRules}
     */
    static readJSON(obj) {
        let rules = new ColoringRules(obj.name);
        Object.assign(rules, obj);
        rules.patterns = obj.patterns.map(rule => ColorRule.readJSON(rule));
        rules.matches = obj.matches.map(rule => MatchColor.readJSON(rule));
        return rules;
    }


    /**
     * @returns {ColoringRules}
     */
    clone() {
        let newRules = new ColoringRules(this.name);
        newRules.patterns = this.patterns.map(pattern => pattern.clone());
        newRules.matches = this.matches.map(match => match.clone());
        return newRules;
    }

    /**
     * @returns {ColoringRules}
     */
    initialize() {
        this.name = DEFAULT_RULE_NAME;
        this.patterns.push(new ColorRule('3', 'hsl(130, 70%, 43%)', 'hsl(4, 90%, 50%)', 'Normal', ''));
        this.patterns.push(new ColorRule('8', 'hsl(4, 90%, 50%)', 'hsl(130, 70%, 43%)', 'Normal', ''));
        this.patterns.push(new ColorRule('[0-9]', null, null, 'Normal', null));
        this.patterns.push(new ColorRule('[a-zA-Z]', null, null, 'Italic', null));
        this.patterns.push(new ColorRule('\\+|×|÷|±', null, null, 'Normal', '0.222em'));
        this.patterns.push(new ColorRule('-', null, null, 'Bold', '0.222em'));
        this.patterns.push(new ColorRule('\\|', null, null, 'Bold', null));
        this.patterns.push(new ColorRule('<|=|>|≠|≤|≥', null, null, 'Normal', '0.278em'));
        this.patterns.push(new ColorRule('.', null, null, 'Normal', null));   // catch everything

        this.patterns.push(new ColorRule('\\(', null, null, 'Normal', '0.167em'));
        this.patterns.push(new ColorRule('\\)', null, null, 'Normal', '0.167em'));

        this.patterns.push(new ColorRule('\\[', null, null, 'Normal', '0.167em'));
        this.patterns.push(new ColorRule('\\]', null, null, 'Normal', '0.167em'));

        this.patterns.push(new ColorRule('\\{', null, null, 'Normal', '0.167em'));
        this.patterns.push(new ColorRule('\\}', null, null, 'Normal', '0.167em'));

        this.matches.push(new MatchColor('#000000', null, false, '#ffffd0', 'None', '2px', '#000000'));

        return this;
    }

    /**
     * Returns a string with the special reg exp chars escaped so it can be used as a literal search string
     * @param {string} ch // should be a single character
     * @returns {string}
     */
    static escapeSpecialChars(ch) {
        return ch.length > 1 ? ch : ch.replace(/[(\\\^\$\.\|\?\*\+\(\)\[\{)]/g, '\\$&');
    }
    /** 
     * @param {string} ch // should be a single character (will escape special chars inside this function
     * @returns {ColorRule}
     */
    match(ch) {
        ch = ColoringRules.escapeSpecialChars(ch)
        return this.patterns.find(colorRule => colorRule.pattern.test(ch));
    }

    /**
     * 
     * @param {string} ch 
     * @param {ColorRule} colorRule     // can be null
     * @param {MatchColor} matchRule    // can NOT be null
     * @returns {ColorRule}             // matching closing char
     */
    mergeCharAndMatchRules(ch, colorRule, matchRule) {
        colorRule = colorRule || new ColorRule(ch, '#000000', '', 'Normal', '');
        return new ColorRule(colorRule.pattern,
            matchRule.fgParenColor,
            matchRule.includeParens ? matchRule.bgInsideColor : matchRule.bgParenColor,
            colorRule.style, colorRule.spacing);
    }
    /** 
     * @param {string} ch       // should be a single character (will escape special chars inside this function)
     * @param {number} iMatch   // index of match rule to use if there is a match
     * @returns {ColorRule}    // matching closing char -- undefined if none
     */
    matchClose(ch, iMatch) {
        const matches = {'(':')', '[':']', '{':'}', '|':'|', '⌊':'⌋', '⌈':'⌉'};
        if (matches[ch]) {
            const chRule = this.match(matches[ch]);
            const matchRule = this.matches[iMatch];
            if (matchRule) {
                return this.mergeCharAndMatchRules(matches[ch], chRule, matchRule);
            }
        }    
        return null;

        /*** Version 0.1
         * return this.matches.rules.find(matchRule => matchRule.nestedOpenColorRule.pattern.test(ch));
         */
    }

    /**
     * Replaces 'ch' in patterns; if not present, adds it
     * @param {string} ch // should be a single character (will escape special chars inside this function)
     * @param {ColorRule} rule 
     */
    replace(ch, rule) {
        const regExForCh = new RegExp(ColoringRules.escapeSpecialChars(ch));
        const i = this.patterns.findIndex(p => p.pattern.source === regExForCh.source);
        if (i >= 0) {
            this.patterns[i] = rule;
        } else {
            this.patterns.unshift(rule);        // put at start so it matches before any builtin patterns
        }
    }

    /**
     * Adds a new HTML element for defining matches after 'el'
     * @param {Element} el
     * @param {MatchColor} matchColor // can be null
     * @param {boolean} [isFirst]
     */
    addNewMatchDefinition(el, matchColor, isFirst) {
        const ACTIVE_COLOR_STYLE = "font-size: 130%; background-color: #fff; padding-top: 2px; border-bottom: 0px;";
        /**
         * 
         * @param {MouseEvent} ev 
         */
        function handleRadioButtonClick(ev) {
            const buttons = ev.target.parentElement.parentElement.querySelectorAll('input[name]');
            if (buttons.length !== 3) {
                console.log(`Should have only been three buttons as targets. Found ${buttons.length}`);
                return;
            }
            const targets = ev.target.parentElement.parentElement.parentElement.querySelectorAll('.match-radio-button-target');
            if (targets.length !== 3) {
                console.log(`Should have only been three button targets. Found ${targets.length}`);
                return;
            }
            for (let i = 0; i < 3; i++) {
                const isThisButtonTheTarget = buttons[i] === ev.target;
                buttons[i].checked = isThisButtonTheTarget;
                buttons[i].parentElement.style = isThisButtonTheTarget ? ACTIVE_COLOR_STYLE : "";
                targets[i].style.display = isThisButtonTheTarget ? 'inline' : 'none';
            }
        }

        /** @type{HTMLTemplateElement} */
        const template = document.getElementById('match-area-template');
        const newRuleNode = template.content.cloneNode(true);
        const newRuleElement = newRuleNode.firstElementChild;
        newRuleElement.querySelector('.match-delete-rule').addEventListener('click',
            () => {this.deleteMatchDefinition(newRuleElement); ColoringRules.Rules.updateAll()} );
        newRuleElement.querySelector('.match-add-rule').addEventListener('click',
            () => {this.addNewMatchDefinition(newRuleElement, null); ColoringRules.Rules.updateAll()} );

        newRuleElement.querySelector('.match-paren-button').addEventListener('click', ev => handleRadioButtonClick(ev));
        newRuleElement.querySelector('.match-contents-button').addEventListener('click', ev => handleRadioButtonClick(ev));
        newRuleElement.querySelector('.match-border-button').addEventListener('click', ev => handleRadioButtonClick(ev));


        newRuleElement.querySelector('.match-paren-fg').addEventListener('change',
            () => this.updateMatchRules() );
        newRuleElement.querySelector('.match-paren-bg').addEventListener('change',
            () => this.updateMatchRules() );
        newRuleElement.querySelector('.match-parens-include').addEventListener('change',
            () => this.updateMatchRules() );

        newRuleElement.querySelector('.match-contents-bg').addEventListener('change',
            () => this.updateMatchRules() );
        newRuleElement.querySelector('.border-style').addEventListener('change',
            () => this.updateMatchRules() );
        newRuleElement.querySelector('.border-thickness').addEventListener('change',
            () => this.updateMatchRules() );
        newRuleElement.querySelector('.border-color').addEventListener('change',
            () => this.updateMatchRules() );

        if (matchColor) {
            getInputElement(newRuleElement, ".match-paren-fg").value = matchColor.fgParenColor.toCSSColor('hex');
            getInputElement(newRuleElement, ".match-paren-bg").value = matchColor.bgParenColor.toCSSColor('hex');
            getInputElement(newRuleElement, ".match-parens-include").checked = matchColor.includeParens;

            getInputElement(newRuleElement, ".match-contents-bg").value = matchColor.bgInsideColor.toCSSColor('hex');
            getInputElement(newRuleElement, ".border-style").value = matchColor.borderPosition;
            getInputElement(newRuleElement, ".border-thickness").value = matchColor.borderThickness;
            getInputElement(newRuleElement, ".border-color").value = matchColor.borderColor.toCSSColor('hex');
        }

        if (!isFirst) {
            const hr = document.createElement('hr');
            hr.className = 'match-area-hr';
            newRuleElement.parentNode.insertBefore(hr, newRuleElement);
        }
        el.parentNode.insertBefore(newRuleNode, el.nextElementSibling);
        newRuleElement.querySelector('.match-contents-label').style = ACTIVE_COLOR_STYLE;
        newRuleElement.querySelector('.match-contents-group').style.display = 'inline';

        // window.scrollTo(0, document.body.scrollHeight);

        // set/update the rule numbers
        const ruleNumbers = el.parentNode.querySelectorAll('.ruleNumber');
        for (let i = 0; i < ruleNumbers.length; i++) {
            ruleNumbers[i].textContent = `${i + 1}: `;
        }

        // set/update radio button names (must be unique to each group of three)
        const names = el.parentNode.querySelectorAll('input[name]');
        for (let i = 0; i < names.length; i+=3) {
            names[i].name = `match-group-${i}`;
            names[i+1].name = `match-group-${i}`;
            names[i+2].name = `match-group-${i}`;
        }
    };

    /**
     * @param {HTMLElement} el
     */
    deleteMatchDefinition(el) {
        // update line numbers
        const ruleNumbers = document.getElementsByClassName('ruleNumber');
        if (ruleNumbers.length > 1) {
            if (!window.confirm('Are you sure you want to delete this coloring rule?')) {
                return;
            }
            const hrToRemove = el.previousElementSibling.tagName === 'HR' ? el.previousElementSibling : el.nextElementSibling;
            el.parentNode.removeChild(hrToRemove);
            el.parentNode.removeChild(el);

            for (let i = 0; i < ruleNumbers.length; i++) {
                ruleNumbers[i].textContent = `${i + 1}: `;
            }
        }
    }

    updateHTML() {
        // create a new set of HTML for the rules
        // ColoringRules are *not* updated
        const newMatchArea = document.createDocumentFragment();
        const dummyChild = document.createElement('div');       // needed so we can append after it
        newMatchArea.appendChild(dummyChild);
        this.addNewMatchDefinition(newMatchArea.lastElementChild, this.matches[0], true);
        this.matches.slice(1).map( matchColor => this.addNewMatchDefinition(newMatchArea.lastElementChild, matchColor));
        newMatchArea.removeChild(dummyChild);

        // remove the old match rules
        document.querySelectorAll('.match-area, .match-area-hr').forEach(element => {
            element.parentNode.removeChild(element);
        });

        // now add the new ones
        document.querySelector('#action-area').appendChild(newMatchArea);
    }

    /** 
     * This is a simple recursive parser that looks for open/close to being/end a new span
     * @param {string} str
     * @returns {string}
     */
    convertToSpan(str) {
        /**
         * 
         * @param {string} ch
         * @returns {number}
         */
        function stackDepth(ch) {
            let depth = 0;
            for (const openClose of matchStack) {
                if (openClose.open === ch || openClose.close === ch) {
                    depth += 1;
                }
            }
            return depth;
        }
        /**
         * 
         * @param {string} ch // uses the closed over 'i' to index into it
         * @param {ColorRule} colorRule 
         */
        function buildSpan(ch, colorRule) {
            return colorRule ?
                `<span style="${colorRule.buildSpanStyle()}">${ch}</span>` :
                ch;
        }

        /** 
         * This is a simple recursive parser that looks for open/close to being/end a new span
         * The contents of the open/close (not the open/close) are put into a new span
         * @param {string} str // uses the closed over 'i' to index into it
         * @param {string} closeCh  // char to close the span (initially won't match anything)
         * @returns {string}
         */
        function nestConvertToSpan(str, closeCh) {
            let result = '';
            for (; i < str.length; i++) {
                let ch = str[i];
                if (ch === closeCh) {
                    return result;  // closeCh not part of match
                }
                const closeColorRule = that.matchClose(ch, iNextMatch);
                const colorRule = that.match(ch);
                result += buildSpan(ch, closeColorRule ?
                    that.mergeCharAndMatchRules(ch, colorRule, that.matches[iNextMatch]) :
                    colorRule);
                if (closeColorRule) {
                    const iFoundMatch = iNextMatch;
                    i += 1;                     // we've handled 'ch' already
                    const closeCh = closeColorRule.pattern.source.replace('\\', '');
                    matchStack.push({ open: ch, close: closeCh});
                    iNextMatch = (iNextMatch + 1) % that.matches.length;
                    const nestedSpan = nestConvertToSpan(str, closeCh);
                    matchStack.pop();
                    ch = str[i];
                    if (nestedSpan) {
                        const nestSpanStyle = 
                            that.matches[iFoundMatch].buildSpanStyle(stackDepth(ch) === 0 ? '' : 'nested');
                        
                        result += `<span style="display: inline-block; ${nestSpanStyle}">${nestedSpan}</span>`;
                    }

                    // the call to nestConvertToSpan returned either because it found a match or because the string ended
                    if (i < str.length) {
                        const colorRule = that.match(ch);
                        result += buildSpan(ch, closeColorRule ? closeColorRule : colorRule);
                    }
                }
            }
            return result;
        };

        let i = 0;          // index into string
        let iNextMatch = 0; // next match to use
        /** @type {{open:string, close:string}[]} */
        let matchStack = [];
        const that = this;
        return nestConvertToSpan(str, '');
    }

    updatePalettes() {
        // don't want match rule to kick for the char palletes -- if they were exprs, it would make sense to do that (maybe)
        let noMatchColorRules = this.clone();
        noMatchColorRules.matches = [];
        for (const paletteId of PaletteIds) {
            const paletteElement = getInputElementByID(paletteId);
            if (!paletteElement)
                break;
            const buttons = paletteElement.getElementsByTagName('button');
            for (const button of buttons) {
                button.innerHTML = noMatchColorRules.convertToSpan(button.innerText);
            }
        }
    }

    updateCharArea() {
        const editAreaEl = getInputElementByID('edit-input');
        const colorRule = this.match(editAreaEl.innerText.trim()) || new ColorRule('\uffff', '', '', "Normal", '');

        editAreaEl.innerHTML = this.convertToSpan(editAreaEl.innerText.trim());

        getInputElementByID('text-color').value = colorRule.fgColor.toCSSColor('hex');
        getInputElementByID('bg-color').value = colorRule.bgColor.toCSSColor('hex');

        /** @type{HTMLSelectElement} */
        // @ts-ignore
        let el = document.getElementById('font-style');
        for (let i = 0; i < el.options.length; i++) {
            el.options.item(i).selected = (el.options.item(i).label === colorRule.style);
        }

        // @ts-ignore
        el = document.getElementById('spacing');
        for (let i = 0; i < el.options.length; i++) {
            el.options.item(i).selected = (el.options.item(i).value === colorRule.spacing);
        }

        const oppositeEditArea = getInputElementByID('opposite-input');
        // @ts-ignore
        const complementaryRules = getComplimentaryRules(oppositeEditArea.innerText, colorRule);
        oppositeEditArea.style.color = complementaryRules.patterns[0].fgColor.toCSSColor('hsl');
        oppositeEditArea.style.backgroundColor = complementaryRules.patterns[0].bgColor.toCSSColor('hsl');
    }

    updateMatchRules() {
        const matchAreas = document.getElementsByClassName('match-area');
        this.matches = [];
        for (let i = 0; i < matchAreas.length; i++) {
            this.matches[i] = MatchColor.buildMatchColor(matchAreas[i], i);
        }
        ColoringRules.Rules.updateAllTestInputs();
    }

    /**
     * 
     * @param {HTMLInputElement} testArea 
     */
    updateTestInput(testArea) {
        const caretOffset = getCaretPosition(testArea);
        testArea.innerHTML = this.convertToSpan(testArea.textContent.trim());
        setCaretPosition(testArea, caretOffset);
    }

    updateAllTestInputs() {
        const testAreas = document.getElementsByClassName('test-input');
        for (let i = 0; i < testAreas.length; i++) {
            // @ts-ignore
            this.updateTestInput(testAreas.item(i));
        }
    }

    updateAll() {
        this.updatePalettes();
        if (IsRuleCreationPage) {
            this.updateMatchRules();
            this.updateCharArea();
        }
        this.updateAllTestInputs();
    }

    /**
     * @returns {version: string, data: ColoringRules} 
     */
    wrapWithVersionNumber() {
        return {version: VERSION, data: this};
    }

    /**
     * 
     * @param {Object} ruleObj 
     * @returns {boolean}
     */
    looksLikeColoringRule(ruleObj) {
        return (ruleObj['version'] && ruleObj['data'] && ruleObj['data']['matches']) ||
               (ruleObj['name'] && ruleObj['patterns'] && ruleObj['matches']);  // version 0.1 lacked the version #
    }

    rulesList() {
        let dataListElement = getInputElementByID('rulesList');
        dataListElement.innerHTML = '';

        const storage = window.localStorage;
        for (let i = 0; i < storage.length; i++) {
            const key = storage.key(i);
            let value;
            try {
                value = JSON.parse(storage.getItem(key));
            } catch (e) {
                value = {};
            }
            if (this.looksLikeColoringRule(value)) {
                const newOptionElement = document.createElement('option');
                newOptionElement.setAttribute('value', storage.key(i));
                dataListElement.appendChild(newOptionElement);
            }
        }
    }
    /**
     * 
     * @param {string} name 
     */
    saveRules(name) {
        if (name.length === 0) {
            alert('You must type a name for the rule');
            return;
        }

        const storage = window.localStorage;

        // put up a warning if we are about to overwrite an existing rule (without this name)
        for (let i = 0; i < storage.length; i++) {
            if (name === storage.key(i) && name !== this.name) {
                if (confirm(`Are you sure you want to overwrite the rules for ${name}?`)) {
                    break;
                } else {
                    return;
                }
            }
        }
        this.name = name;
        try {
            const asString = JSON.stringify(this.wrapWithVersionNumber());
            storage.setItem(name, asString);
            storage.setItem(STORAGE_NAME__STARTUP_COLORING_RULES, name);
            this.saveStatus(true);
            ColoringRules.Rules.rulesList();        // update the list of rules
        }
        catch (err) {
            alert("Could not store rule!");
        }
    }

    versionCleanUp(ruleObj) {
        if (ruleObj.version) {
            if (ruleObj.version !== "0.2") {
                console.log(`Attempting to read unknown rule version '${ruleObj.version}'`);
            }
            return ruleObj.data;     // v0.2 rules
        } else {
            // v0.1 -- matches don't make sense in V0.2, so drop them
            ruleObj.matches = [];
            return ruleObj;
        }
    }

    /**
     * 
     * @param {string} name 
     */
    loadRules(name) {
        if (name.length === 0) {
            alert('You must type a name for the rule');
            return;
        }

        if (!ColoringRules.Saved && confirm(`Current coloring rule ${this.name} is not saved. Do you want to save it?`)) {
            this.saveRules(this.name);
        }

        const storage = window.localStorage;
        const ruleString = storage.getItem(name);
        const ruleObj = !ruleString || JSON.parse(ruleString);
        if (!ruleString || !this.looksLikeColoringRule(ruleObj)) {
            alert(`No rule found for ${name}`);
            return;
        }

        ColoringRules.Rules = ColoringRules.readJSON(this.versionCleanUp(ruleObj));
        if (IsRuleCreationPage) {
            ColoringRules.Rules.updateHTML();
        }
        storage.setItem(STORAGE_NAME__STARTUP_COLORING_RULES, name);
        ColoringRules.Rules.saveStatus(true);
        ColoringRules.Rules.updateAll();
        RememberNewRules(ColoringRules.Rules);
        ColoringRules.Rules.rulesList();                          // update the list of rules
    }

    copyToClipboard() {
        navigator.clipboard.writeText(JSON.stringify(this.wrapWithVersionNumber()))
            .catch(
                err => {
                    alert(`Error! Could not copy text: ${err}`);
                });
    }

    pasteFromClipboard() {
        return navigator.clipboard.readText().then(
            result => {
                if (!ColoringRules.Saved && confirm(`Current coloring rule ${this.name} is not saved. Do you want to save it?`)) {
                    this.saveRules(this.name);
                }
                const newRules = JSON.parse(result);
                if (this.looksLikeColoringRule(newRules)) {
                    ColoringRules.Rules = ColoringRules.readJSON(this.versionCleanUp(newRules));
                    window.localStorage.setItem(STORAGE_NAME__STARTUP_COLORING_RULES, newRules.name);
                    ColoringRules.Rules.saveStatus(true);
                    ColoringRules.Rules.updateAll();
                    RememberNewRules(ColoringRules.Rules);
                } else {
                    alert("Error: clipboard does not contain rules for coloring math");
                }
            }
        )
            .catch(
                err => {
                    alert(`Error: wasn't able to read text from clipbaord: ${err}`);
                })
    }

    removeAllRules() {
        if (confirm('Are you sure you want to remove all of the stored coloring rules?')) {
            window.localStorage.clear();
        }
    }

    /**
     * 
     * @param {boolean} saved 
     */
    saveStatus(saved) {
        ColoringRules.Saved = saved;
        const message = `Current coloring rule: ${this.name}` + (saved ? '' : ' (NOT SAVED)');
        getInputElementByID('current-rule').innerText = message;
    }
}

// The global (permantent) instance of coloring rules
/** @type{ColoringRules} */
ColoringRules.Rules = null;
ColoringRules.Saved = true;



class EditHistory {
    // Keep track of typing state for undo/redo.
    // Because we change the data, the normal undo/redo for contenteditable fail and do nothing
    /**
     * 
     * @param {string} initState 
     */
    constructor(initState) {
        // @type {{string, number}[]
        this.state = [{ str: initState, caretPos: initState.length }];
        this.current = 0;       // pointer to the current state (undo doesn't pop stat) -- normally this.state.length()-1
    }

    /**
     * 
     * @param {string} str       // new string 
     * @param {number} caretPos  // where caret is in string 
     */
    newState(str, caretPos) {
        if (this.current + 1 < this.state.length) {
            this.state = this.state.slice(0, this.current + 1);
        }
        this.state.push({ str: str, caretPos: caretPos });
        this.current++;
    }

    /**
     * @return {{string, number}} -- the new state or null
     */
    redo() {
        if (this.current + 1 > this.state.length) {
            return null;
        } else {
            this.current++;
            return this.state[this.current];
        }
    }

    /**
     * @return {{string, number}} -- the new state or null
     */
    undo() {
        if (this.current < 1) {
            return null;
        } else {
            this.current--;
            return this.state[this.current];
        }
    }
}

/**
 * This is added to avoid having lots of "type" errors when accessing the input fields
 * @param {string} id 
 * @returns {HTMLInputElement}
 */
function getInputElementByID(id) {
    // @ts-ignore
    return document.querySelector('#' + id);
}

/**
 * This is added to avoid having lots of "type" errors when accessing the input fields
 * @param {Node} node
 * @param {string} selector 
 * @returns {HTMLInputElement}
 */
function getInputElement(node, selector) {
    // @ts-ignore
    return node.querySelector(selector);
}

/** @type {{id: string, charID: string, matchFn: string, ruleAccessor: string | string[]}[]} */
const IdMapping = [
    { id: 'text-color', charID: 'edit-input', matchFn: 'match', ruleAccessor: 'fgColor' },
    { id: 'bg-color', charID: 'edit-input', matchFn: 'match', ruleAccessor: 'bgColor' },
    { id: 'font-style', charID: 'edit-input', matchFn: 'match', ruleAccessor: 'style' },
    { id: 'spacing', charID: 'edit-input', matchFn: 'match', ruleAccessor: 'spacing' },
    { id: 'edit-input', charID: 'edit-input', matchFn: 'match', ruleAccessor: 'pattern' },
    { id: 'opposite-input', charID: 'opposite-input', matchFn: 'match', ruleAccessor: 'pattern' },
    { id: 'match-open-char', charID: 'match-open-char', matchFn: 'match', ruleAccessor: 'pattern' },
    { id: 'match-close-char', charID: 'match-close-char', matchFn: 'match', ruleAccessor: 'pattern' },
    { id: 'match-area-fg-top', charID: 'match-open-char', matchFn: 'match', ruleAccessor: 'fgColor' },
    { id: 'match-area-bg-top', charID: 'match-open-char', matchFn: 'match', ruleAccessor: 'bgColor' },
    { id: 'match-area-fg-bottom', charID: 'match-open-char', matchFn: 'matchClose', ruleAccessor: ['nestedOpenColorRule', 'fgColor'] },
    { id: 'match-area-bg-bottom', charID: 'match-open-char', matchFn: 'matchClose', ruleAccessor: ['nestedOpenColorRule', 'bgColor'] },
    { id: 'match-area-r-fg-top', charID: 'match-close-char', matchFn: 'match', ruleAccessor: 'fgColor' },
    { id: 'match-area-r-bg-top', charID: 'match-close-char', matchFn: 'match', ruleAccessor: 'bgColor' },
    { id: 'match-area-r-fg-bottom', charID: 'match-open-char', matchFn: 'matchClose', ruleAccessor: ['nestedCloseColorRule', 'fgColor'] },
    { id: 'match-area-r-bg-bottom', charID: 'match-open-char', matchFn: 'matchClose', ruleAccessor: ['nestedCloseColorRule', 'bgColor'] },
    { id: 'border-style-top', charID: 'match-open-char', matchFn: 'matchClose', ruleAccessor: ['topMatchColor', 'borderPosition'] },
    { id: 'border-thickness-top', charID: 'match-open-char', matchFn: 'matchClose', ruleAccessor: ['topMatchColor', 'borderThickness'] },
    { id: 'border-color-top', charID: 'match-open-char', matchFn: 'matchClose', ruleAccessor: ['topMatchColor', 'borderColor'] },
    { id: 'bg-top', charID: 'match-open-char', matchFn: 'matchClose', ruleAccessor: ['topMatchColor', 'bgColor'] },
    { id: 'border-style-bottom', charID: 'match-open-char', matchFn: 'matchClose', ruleAccessor: ['nestedMatchColor', 'borderPosition'] },
    { id: 'border-thickness-bottom', charID: 'match-open-char', matchFn: 'matchClose', ruleAccessor: ['nestedMatchColor', 'borderThickness'] },
    { id: 'border-color-bottom', charID: 'match-open-char', matchFn: 'matchClose', ruleAccessor: ['nestedMatchColor', 'borderColor'] },
    { id: 'bg-bottom', charID: 'match-open-char', matchFn: 'matchClose', ruleAccessor: ['nestedMatchColor', 'bgColor'] },
]

const PaletteIds = ['lc-letters', 'uc-letters', 'digits', 'symbols', 'symbols-test'];
const OnClickIds = ['saveRules', 'loadRules', 'copyToClipboard', 'pasteFromClipboard', 'removeAllRules'];
const EditIds = ['edit-input', 'opposite-input', 'match-open-char', 'match-close-char'];

let IsRuleCreationPage = false

window.onload =
    function () {
        IsRuleCreationPage = document.getElementById('match-area-title');

        // get initial coloring rules
        const initColoringRuleName = window.localStorage.getItem(STORAGE_NAME__STARTUP_COLORING_RULES);
        if (initColoringRuleName) {
            try {
                new ColoringRules(initColoringRuleName).loadRules(initColoringRuleName);
                // loadRules sets saveStatus
            }
            catch (error) {
                this.alert("Unable to load stored rule. Will use defaults.")
                ColoringRules.Rules = new ColoringRules(DEFAULT_RULE_NAME).initialize();
                if (IsRuleCreationPage) {
                    // add the initial match rule
                    ColoringRules.Rules.addNewMatchDefinition(document.getElementById("match-area-template"), null, true);
                }
            }
        } else {
            ColoringRules.Rules = new ColoringRules(DEFAULT_RULE_NAME).initialize();
            if (IsRuleCreationPage) {
                // add the initial match rule
                ColoringRules.Rules.addNewMatchDefinition(document.getElementById("match-area-template"), null, true);
            }
            ColoringRules.Rules.saveStatus(true);
        }
        RememberNewRules(ColoringRules.Rules);
        
        // add the palettes
        PaletteIds.forEach(palette => addCharacterPalette(document.getElementById(palette)));

        EditIds.forEach(function (id) {
            const el = document.getElementById(id);
            if (el) {
                new EditHistory(el.textContent);
            }
        });

        // hook up input events for most input elements
        IdMapping.forEach(function (mappingObj) {
            const el = document.getElementById(mappingObj.id);
            if (el) {
                el.addEventListener('input', updateFromNewValue);
            }
        });

        // load up all the rules into the 'datalist'
        ColoringRules.Rules.rulesList();

        // hook up save, load, etc
        OnClickIds.forEach(
            id => document.getElementById(id).addEventListener('click', function () {
                ColoringRules.Rules[id](getInputElementByID('rule-list-input').value);
            })
        );

        const testAreas = document.getElementsByClassName('test-input');
        for (let i = 0; i < testAreas.length; i++) {
            testAreas[i].addEventListener('input', updateTestArea.bind(new EditHistory(testAreas[i].textContent)));
        }

        ColoringRules.Rules.updateAll();
    };

 
/**
 * 
 * @param {HTMLElement} grid 
 */
function addCharacterPalette(grid) {
    if (!grid) {
        return;
    }

    const chars = grid.textContent;
    grid.textContent = '';
    chars.split('').forEach(function (char) {
        let button = document.createElement('button');
        button.className = 'button';
        const colorRule = ColoringRules.Rules.match(char);
        button.innerHTML = colorRule ? `<span style='${colorRule.buildSpanStyle()}'>${char}</span>` : char;
        button.onclick = /test/.test(grid.id) ? copyCharToTestArea : copyCharToEditArea;
        grid.appendChild(button);
    });
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
function copyCharToEditArea(ev) {
    let editInputArea = document.getElementById('edit-input');
    editInputArea.innerHTML = this.innerText;
    ColoringRules.Rules.updateAll();
}

/**
 * 
 * @param {InputEvent} e 
 */
function updateTestArea(e) {
    /** @type {HTMLInputElement} */
    // @ts-ignore
    const targetEl = e.target;
    const caretPos = getCaretPosition(targetEl);   // the history cases muck up the caret position
    switch (e.inputType) {
        case 'historyRedo':
            e.preventDefault();
            const redoText = this.redo();
            if (typeof redoText !== 'undefined') {
                targetEl.innerText = redoText.str;
                setCaretPosition(targetEl, redoText.caretPos);
            }
            break;
        case 'historyUndo':
            e.preventDefault();
            const undoText = this.undo();
            if (typeof undoText !== 'undefined') {
                targetEl.innerText = undoText.str;
                setCaretPosition(targetEl, undoText.caretPos);
            }
            break;
        case 'fakeEvent':
            break;      // synthesized fake event

        default:
            e.preventDefault();
            // someone could have clicked elsewhere before making a change -- reset cursor position
            const newStr = targetEl.textContent.trim();
            const nChange = newStr.length - this.state[this.current].str.length;
            this.state[this.current].caretPos = caretPos - nChange;
            this.newState(newStr, caretPos);
            break;
    }
    ColoringRules.Rules.updateTestInput(targetEl);
}

/**
 * 
 * @param {string} chars       // could be more than one character
 * @param {ColorRule} colorRule
 * @returns {ColoringRules}
 */
function getComplimentaryRules(chars, colorRule) {
    const bgColor = colorRule.bgColor.toHSL().clone();
    let [compForeground, compBackground] = bgColor.toComplementary();

    chars = chars || '\uffff';  // safe value to use since it will never match anything
    let result = new ColoringRules('temp');;
    for (const ch of chars) {
        result.replace(ch, new ColorRule(ch, compForeground, compBackground, colorRule.style, colorRule.spacing));
    }

    return result;
}

/**
 * 
 * @param {InputEvent} e 
 */
function updateFromNewValue(e) {
    /**
     * 
     * @param {string} ch 
     * @param {ColorRule|MatchingColorRule} rule 
     * @param {string|string[]} accessor 
     * @param {string} replaceFn 
     * @param {HTMLInputElement} el 
     */
    function setValue(ch, rule, accessor, replaceFn, el) {
        let key;
        let subRule = rule;
        if (typeof accessor === 'string') {
            key = accessor;
        } else {

            for (let i = 0; i < accessor.length - 1; i++) {
                subRule = subRule[accessor[i]];
            }
            key = accessor[accessor.length - 1];
        }
        let value;
        switch (el.type) {
            case 'color':
                value = new Color(el.value);
                break;
            case 'select-one':
                value = key === 'borderPosition' ? el.selectedOptions[0].label : el.selectedOptions[0].value;
                break;
            default:    // should be contenteditable input field
                if (typeof el.type !== 'undefined') {
                    console.log(`Unknown input type '${el.type}'`);
                }
                value = new RegExp(ColoringRules.escapeSpecialChars(el.innerText));
                break;
        }
        subRule[key] = value;
        ColoringRules.Rules[replaceFn](ch, rule);
    }

    // from the target (the field that changed), we get the info to figure out how to:
    // 1. get the rule for the character associated with the target
    // 2. the rule associated with that character (if any)
    // 3. the way to access the appropriate structure so that we create a new rule/replace the old one with the new value
    /** @type {HTMLInputElement} */
    // @ts-ignore
    const targetEl = e.target;
    /** @type {{id: string, charID: string, matchFn: string, ruleAccessor: string | string[]}} */
    const mappingObj = IdMapping.find(obj => obj.id === targetEl.id);
    const charElement = getInputElementByID(mappingObj.charID);
    if (charElement.innerText.trim().length !== 1) {
        return;
    }

    const ch = charElement.innerText.trim();
    const rule = mappingObj.id === 'opposite-input' ?
        new ColorRule(charElement.innerText.trim(), charElement.style.color, charElement.style.backgroundColor, 'Normal', '') :
        ColoringRules.Rules[mappingObj.matchFn](ch) || new ColorRule('\uffff', '', '', "Normal", '');
    const newRule = (mappingObj.matchFn === 'match') ?
        new ColorRule(ch, rule.fgColor, rule.bgColor, rule.style, rule.spacing) :
        new MatchingColorRule(rule.nestedOpenColorRule, rule.nestedCloseColorRule,
            rule.topMatchColor.clone(), rule.nestedMatchColor.clone());
    const replaceFn = mappingObj.matchFn === 'match' ? 'replace' : 'replaceMatch';
    setValue(ch, newRule, mappingObj.ruleAccessor, replaceFn, targetEl);

    if (EditIds.find(id => id === targetEl.id)) {
        charElement.innerText = e.data;     // reset the field so that there is only a single char in it
    }
    /**** Version 0.1
    if (targetEl.id === 'match-close-char') {
        // need to update the close char that matches the open char
        const openCh = getInputElementByID('match-open-char').innerText.trim();
        if (openCh.length === 1) {
            const rule = ColoringRules.Rules.matchClose(openCh);
            rule.nestedCloseColorRule = new ColorRule(ch,
                rule.nestedCloseColorRule.fgColor, rule.nestedCloseColorRule.bgColor,
                rule.nestedCloseColorRule.style, rule.nestedCloseColorRule.spacing);
        }
    }
    ***/

    ColoringRules.Rules.updateAll();
}


Color.LightGray = new Color('#D2D2D2');
Color.Gray = new Color('#808080')
function RememberNewRules(rules) {
    modifyColor.savedRules = rules;
}

/**
 * 
 * @param {{}} buttonStatus 
 */
function modifyColor(buttonStatus) {
    /**
     * Moves color half to 0 (dark) or 100 (light)
     * @param {Color} color
     * @param {boolean} bolder
     * @param {boolean} lighter
     * @returns {Color}
     */
    function lighten(color, bolder, lighter) {
        color = color || Color[lighter ? 'Black' : 'White'].clone();
        if (color.toRGB() == Color.Transparent) {
            return color;    // leave transparent color alone
        }
        color = color.toHSL();

        // handling black and white don't work well with the normal code (using HSL), so special cased here
        if (color.c3 === 0) {
                color = lighter ? new Color('#404040') : color;
        } else if (color.c3=== 255) {
            color = lighter ? color : new Color('#B4B4B4');
        } else if (bolder) {
            color.c3 = color.c3/2 + 25;       // move towards 50
        } else {
            const inc = lighter ? 100 : 0;      // move towards 100 (white) or 0 (black)
            color.c3 = (inc + color.c3)/2;
        }
        return color;
    }

    /**
     * 
     * @param {Color} fgColor 
     * @param {Color} bgColor 
     * @param {boolean} changeFG 
     * @param {boolean} changeBG 
     * @param {boolean} lightenColor
     * @returns {[Color, Color]}
     */
    function lightenOrDarkenColor(fgColor, bgColor, changeFG, changeBG, lightenColor) {
        const newFG = changeFG ? lighten(fgColor, false, false) : fgColor;
        const newBG = changeBG ? lighten(bgColor, false, true) : bgColor;
        const colorScale = lightenColor ? 0.65 : 0.45;
        if (changeFG) {
            const [light, dark] = newFG.scaleColor(colorScale);
            fgColor = newBG.contrast(newFG, light);
        }
        if (changeBG) {
            const [light, dark] = newBG.scaleColor(colorScale);
            bgColor = fgColor.contrast(newBG, dark);
        }
        return [fgColor, bgColor];
    }

    ColoringRules.Rules = modifyColor.savedRules.clone();
    // there is a complication in that if (say) the text is white and we remove background, the text is invisible
    // in these cases, we find a contrast color if needed (same idea holds for weaker/stronger coloring)
    if (!buttonStatus.AsDesigned) {
        if (buttonStatus.Text || buttonStatus.Background) {
            ColoringRules.Rules.patterns = ColoringRules.Rules.patterns.map(function (pattern) {
                if (buttonStatus.None) {
                    if (buttonStatus.Text) {
                        pattern.fgColor = (buttonStatus.Background || pattern.bgColor === null) ? null : pattern.bgColor.contrast(Color.Black, Color.Gray);
                    }
                    if (buttonStatus.Background) {
                        pattern.bgColor = (buttonStatus.Text || pattern.fgColor === null) ? null : pattern.fgColor.contrast(Color.White, Color.Gray);
                    }
                } else if (buttonStatus.Weak) {
                    [pattern.fgColor, pattern.bgColor] = lightenOrDarkenColor(pattern.fgColor, pattern.bgColor, buttonStatus.Text, buttonStatus.Background, true);
                } else if (buttonStatus.Strong) {
                    [pattern.fgColor, pattern.bgColor] = lightenOrDarkenColor(pattern.fgColor, pattern.bgColor, buttonStatus.Text, buttonStatus.Background, false);
                }
                return pattern;
            })
        }

        if (buttonStatus.MatchingArea) {
            if (buttonStatus.None) {
                ColoringRules.Rules.matches = [];
            } else {
                ColoringRules.Rules.matches.map(function (match) {
                    let dummy = null;
                    if (buttonStatus.Weak) {
                        [dummy, match.bgInsideColor] = lightenOrDarkenColor(match.fgParenColor, match.bgInsideColor, false, true, true);
                        [match.fgParenColor, match.bgParenColor] = lightenOrDarkenColor(match.fgParenColor, match.bgParenColor, buttonStatus.Text, buttonStatus.Background, true);
                    } else if (buttonStatus.Strong) {
                        [dummy, match.bgInsideColor] = lightenOrDarkenColor(match.fgParenColor, match.bgInsideColor, false, true, false);
                        [match.fgParenColor, match.bgParenColor] = lightenOrDarkenColor(match.fgParenColor, match.bgParenColor, buttonStatus.Text, buttonStatus.Background, false);
                    }
                    return match;
                })
            }
        }
    }
    ColoringRules.Rules.updateAll();
}

/***********
 * Code to get and set the caret/cursor position
 * When the contents get redrawn, the caret position gets losts, so we need to handle it ourself.
 * getCaretPosition/setCaretPosition taken from stackexchange.com and modified slightly
 ***********/
/**
 * 
 * @param {HTMLElement} editEl
 * @returns {number}
 */
function getCaretPosition(editEl) {
    let caretOffset = 0;
    let doc = editEl.ownerDocument || editEl.document;
    let win = doc.defaultView || doc.parentWindow;
    let sel;
    if (typeof win.getSelection != "undefined") {
        sel = win.getSelection();
        if (sel.rangeCount > 0) {
            let range = win.getSelection().getRangeAt(0);
            let preCaretRange = range.cloneRange();
            preCaretRange.selectNodeContents(editEl);
            preCaretRange.setEnd(range.endContainer, range.endOffset);
            caretOffset = preCaretRange.toString().length;
        }
    } else if ((sel = doc.selection) && sel.type != "Control") {
        let textRange = sel.createRange();
        let preCaretTextRange = doc.body.createTextRange();
        preCaretTextRange.moveToeditElText(editEl);
        preCaretTextRange.setEndPoint("EndToEnd", textRange);
        caretOffset = preCaretTextRange.text.length;
    }
    return caretOffset;
}



/**
 * 
 * @param {HTMLElement} editEl 
 * @param {number} chars 
 */
function setCaretPosition(editEl, chars) {
    /**
     * 
     * @param {Node} node 
     * @param {number} chars 
     * @param {Range} [range]
     * @returns {[number, Range]}
     */
    function createRange(node, chars, range) {
        if (!range) {
            range = document.createRange()
            range.selectNode(node);
            range.setStart(node, 0);
        }

        if (chars === 0) {
            range.setEnd(node, chars);
        } else if (node && chars > 0) {
            if (node.nodeType === Node.TEXT_NODE) {
                if (node.textContent.length < chars) {
                    chars -= node.textContent.length;
                } else {
                    range.setEnd(node, chars);
                    chars = 0;
                }
            } else {
                for (let lp = 0; lp < node.childNodes.length; lp++) {
                    [chars, range] = createRange(node.childNodes[lp], chars, range);

                    if (chars === 0) {
                        break;
                    }
                }
            }
        }

        return [chars, range];
    };

    if (chars >= 0) {
        let selection = window.getSelection();
        let range;

        [chars, range] = createRange(editEl, chars);

        if (range) {
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
        }
    }
};

export { EditHistory, updateTestArea, modifyColor }