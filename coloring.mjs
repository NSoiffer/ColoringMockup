// @ts-check
/* -*- Mode: Java; tab-width: 4; indent-tabs-mode:nil; c-basic-offset: 4 -*- */
/* vim: set ts=4 et sw=4 tw=80: */

const DEFAULT_RULE_NAME = 'default coloring rules';
const STORAGE_NAME__STARTUP_COLORING_RULES = 'ColoringRulesStartupRuleName';

/**************
 * RegExp doesn't stringify by default. We add the method here
 *************************/
Object.defineProperty(RegExp.prototype, "toJSON", {
    value: RegExp.prototype.toString
  });



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
     * 
     * @param {Object} obj 
     * @returns {Color}
     */
    static readJSON(obj) {
        return obj ? new Color(obj.enc, obj.c1, obj.c2, obj.c3) : null;
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

/**
 * @param{string} str
 * @retruns {RegExp}
 */
function RegExpFromPatternString(str) {
    if (str.length > 2 && str[0] === '/' && str[str.length-1] === '/') {
        str = str.slice(1,-1);
    }
    return new RegExp(str);
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
        this.pattern = RegExpFromPatternString(pattern);
        this.fgColor = fgColor ? (typeof fgColor === 'string' ? new Color(fgColor) : fgColor) : null;
        this.bgColor = bgColor ? (typeof bgColor === 'string' ? new Color(bgColor) : bgColor) : null;
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
            let css = this.style.toLowerCase() === 'bold' || this.style.toLowerCase() === 'bolder' ?
                    'font-weight' : 'font-style';
            style += ` ${css}: ${this.style};`;
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
     * @param {string|Color} bgColor 
     * @param {string} borderPosition               // none, top, bottom, all
     * @param {string} borderThickness 
     * @param {string|Color} borderColor 
     */
    constructor(bgColor, borderPosition, borderThickness, borderColor) {
        this.bgColor = bgColor ? (typeof bgColor === 'string' ? new Color(bgColor) : bgColor) : null;
        this.borderPosition = borderPosition;
        this.borderThickness = borderThickness;
        this.borderColor = borderColor ? (typeof borderColor === 'string' ? new Color(borderColor) : borderColor) : null;
    }

    /**
     * 
     * @param {Object} obj 
     * @returns {MatchColor}
     */
    static readJSON(obj) {
        return obj ? new MatchColor(
                            Color.readJSON(obj.bgColor),
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
        if (nested) {
            style += ` margin: 1px;`
        }
        if (this.bgColor) {
            style += ` background-color: ${this.bgColor.toCSSColor('hex')};`;
        }
        switch(this.borderPosition) {
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
     * @param {string} openCh
     * @param {string} closeCh
     * @param {ColorRule} nestedOpenColorRule 
     * @param {ColorRule} nestedCloseColorRule 
     * @param {MatchColor} topMatchColor 
     * @param {MatchColor} nestedMatchColor 
     */
    constructor(openCh, closeCh, nestedOpenColorRule, nestedCloseColorRule, topMatchColor, nestedMatchColor) {
        this.openCh = RegExpFromPatternString(openCh);
        this.closeCh = RegExpFromPatternString(closeCh);
        this.nestedOpenColorRule = nestedOpenColorRule;
        if (this.openCh.source !== nestedOpenColorRule.pattern.source) {
            console.log(`openCh '${openCh}' does not match char in nestedOpenColorRule '${nestedOpenColorRule.pattern.source}`)
        }
        this.nestedCloseColorRule = nestedCloseColorRule;
        if (this.closeCh.source !== nestedCloseColorRule.pattern.source) {
            console.log(`openCh '${closeCh}' does not match char in nestedOpenColorRule '${nestedCloseColorRule.pattern.source}`)
        }
        this.topMatchColor = topMatchColor;
        this.nestedMatchColor = nestedMatchColor;
    }

    /**
     * 
     * @param {Object} obj 
     * @returns {MatchingColorRule}
     */
    static readJSON(obj) {
        return obj ? new MatchingColorRule(
                            obj.openCh,
                            obj.closeCh,
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
         /** @type {MatchingColorRule[]} */
        this.matches  = [];
    }

    /**
     * 
     * @param {Object} obj 
     * @returns {ColoringRules}
     */
    static readJSON(obj) {
        let rules = new ColoringRules(obj.name);
        Object.assign(rules, obj);
        rules.patterns = obj.patterns.map( rule => ColorRule.readJSON(rule) );
        rules.matches = obj.matches.map( match => MatchingColorRule.readJSON(match) );
        return rules;
    }


    /**
     * @returns {ColoringRules}
     */
    clone() {
        let newRules = new ColoringRules(this.name);
        newRules.patterns = Object.assign([], this.patterns);
        newRules.matches = Object.assign([], this.matches);
        return newRules;
    }

    /**
     * @returns {ColoringRules}
     */
    initialize() {
        this.name = DEFAULT_RULE_NAME;
        this.patterns.push( new ColorRule('3', 'hsl(130, 70%, 43%)', 'hsl(4, 90%, 50%)', 'normal', '') );
        this.patterns.push( new ColorRule('8', 'hsl(4, 90%, 50%)', 'hsl(130, 70%, 43%)', 'normal', '') );
        this.patterns.push( new ColorRule('\\(', 'hsl(0, 0%, 100%)', 'hsl(0, 0%, 40%)', 'normal', '0.167em') );
        this.patterns.push( new ColorRule('\\)', 'hsl(0, 0%, 100%)', 'hsl(0, 0%, 40%)', 'normal', '0.167em') );
        this.patterns.push( new ColorRule('[0-9]', '', '', 'normal', '') );
        this.patterns.push( new ColorRule('[a-zA-Z]', '', '', 'italic', '') );
        this.patterns.push( new ColorRule('\\+|×|÷|±', '', '', 'normal', '.222em') );
        this.patterns.push( new ColorRule('-', '', '', 'bold', '.222em') );
        this.patterns.push( new ColorRule('\\|', '', '', 'bold', '') );
        this.patterns.push( new ColorRule('<|=|>|≠|≤|≥', 'hsl(0,0%,100%)', 'hsl(160, 10%, 10%)', 'normal', '.278em') );
        
        this.replaceMatch('(', new MatchingColorRule('\\(', '\\)',
            new ColorRule('\\(', 'hsl(240, 100%, 70%)', 'hsl(0, 0%, 60%)', 'normal', ''),
            new ColorRule('\\)', 'hsl(240, 100%, 70%)', 'hsl(0, 0%, 60%)', 'normal', ''),
            new MatchColor('', 'Box','0.111em','hsl(0,0%, 50%)'),
            new MatchColor('hsl(240, 100%, 95%)', 'None','0.111em','hsl(0,0%, 30%)')
         ));
         this.replaceMatch('\\[', new MatchingColorRule('\\[', '\\]',
            new ColorRule('\\[', 'hsl(240, 100%, 70%)', 'hsl(0, 0%, 60%)', 'normal', ''),
            new ColorRule('\\]', 'hsl(240, 100%, 70%)', 'hsl(0, 0%, 60%)', 'normal', ''),
            new MatchColor('', 'Below','2px','hsl(0,0%, 50%)'),
            new MatchColor('hsl(270, 100%, 95%)', 'Above','2px','hsl(0,0%, 30%)')
        ));
        this.replaceMatch('\\{', new MatchingColorRule('\\{', '}',
            new ColorRule('\\{', 'hsl(240, 100%, 70%)', 'hsl(0, 0%, 60%)', 'normal', ''),
            new ColorRule('}', 'hsl(240, 100%, 70%)', 'hsl(0, 0%, 60%)', 'normal', ''),
            new MatchColor('', 'Box','0.222em','hsl(0,0%, 50%)'),
            new MatchColor('', 'None','0.111em','hsl(0,0%, 30%)')
        ));
        return this;
    }

    /**
     * Returns a string with the special reg exp chars escaped so it can be used as a literal search string
     * @param {string} ch // should be a single character
     * @returns {string}
     */
    escapeSpecialChars(ch) {
        return ch.length > 1 ? ch : ch.replace(/[(\\\^\$\.\|\?\*\+\(\)\[\{)]/g, '\\$&');
    }
    /** 
     * @param {string} ch // should be a single character
     * @returns {ColorRule}
     */
    match(ch) {
        return this.patterns.find( colorRule => colorRule.pattern.test(this.escapeSpecialChars(ch)) );
    }

    /** 
     * @param {string} ch // should be a single character
     * @param {boolean} matchOpen // should be a single character
     * @returns {MatchingColorRule}
     */
    matchMatch(ch, matchOpen) {
        return matchOpen ?
        this.matches.find( matchRule => matchRule.openCh.test(this.escapeSpecialChars(ch)) ) :
        this.matches.find( matchRule => matchRule.closeCh.test(this.escapeSpecialChars(ch)) );
    }

    /**
     * Replaces 'ch' in patterns; if not present, adds it
     * @param {string} ch 
     * @param {ColorRule} rule 
     */
    replace(ch, rule) {
        const regExForCh = new RegExp( this.escapeSpecialChars(ch) );
        const i = this.patterns.findIndex( p => p.pattern.source === regExForCh.source);
        if (i >= 0) {
            this.patterns[i] = rule;
        } else {
            this.patterns.unshift(rule);        // put at start so it matches before any builtin patterns
        }
    }

    /**
     * Replaces 'ch' in patterns; if not present, adds it
     * @param {string} ch 
     * @param {MatchingColorRule} rule 
     */
    replaceMatch(ch, rule) {
        const regExForCh = new RegExp( this.escapeSpecialChars(ch) );
        const i = this.matches.findIndex( m => m.openCh == regExForCh );
        if (i >= 0) {
            this.matches[i] = rule;
        } else {
            this.matches.unshift(rule);        // put at start so it matches before any builtin patterns
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
                `<span>${ch}</span>`;
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
                const matchRule = that.matchMatch(ch, true);
                const colorRule = !matchRule || (stackDepth(ch) === 0) ? that.match(ch) : matchRule.nestedOpenColorRule;
                result += buildSpan(ch, colorRule);
                if (matchRule) {
                    i += 1;                     // we've handled 'ch' already
                    matchStack.push({open: ch, close: matchRule.closeCh.source.replace("\\", "")});
                    const nestedSpan = nestConvertToSpan(str, matchRule.closeCh.source.replace("\\", ""));
                    matchStack.pop();
                    ch = str[i];
                    if (nestedSpan) {
                        const nestSpanStyle = stackDepth(ch) === 0 ?
                                matchRule.topMatchColor.buildSpanStyle() :
                                matchRule.nestedMatchColor.buildSpanStyle('nested');
                        result += `<span style="${nestSpanStyle}">${nestedSpan}</span>`;
                    }

                    // the call to nestConvertToSpan returned either because it found a match or because the string ended
                    if (i < str.length) {
                        const colorRule = stackDepth(ch) === 0 ? that.match(ch) : matchRule.nestedCloseColorRule;
                        result += buildSpan(ch, colorRule);
                    }
                }
            }
            return result;
        };

        let i = 0;      // index into string
        /** @type {{open:string, close:string}[]} */
        let matchStack = [];
        const that = this;
        return nestConvertToSpan(str, '');
    }

    updatePalettes() {
        for (const palette of PaletteIds) {
            const buttons = getInputElement(palette).getElementsByTagName('button');
            for (const button of buttons) {
                button.innerHTML = this.convertToSpan(button.innerText);
            }
        }
    }

    updateMatchArea() {
        /**
         * @param {Object} obj
         */
        function updateLeftOrRightSide(obj) {
            const el = getInputElement(obj.charID);
            const ch = el.innerText;
            const caretOffset = getCaretPosition(el);
            el.innerHTML = that.convertToSpan(ch);
            setCaretPosition(el, caretOffset);
            
            const colorRule = that.match(ch);
            if (colorRule) {
                if (colorRule.fgColor) {
                    getInputElement(obj.fgID).value = colorRule.fgColor.toCSSColor('hex');
                }
                if (colorRule.bgColor) {
                    getInputElement(obj.bgID).value = colorRule.bgColor.toCSSColor('hex');
                }
            }
            document.getElementsByClassName(obj.demoCharID)[0].setAttribute('style', colorRule.buildSpanStyle());
            const nestColorRule = that.matchMatch(ch, obj.open);
            const nestRule = open ? 'nestedOpenColorRule' : 'nestedCloseColorRule';
            if (nestColorRule) {
                if (nestColorRule) {
                    getInputElement(obj.nestfgID).value = nestColorRule[nestRule].fgColor.toCSSColor('hex');
                }
                if (nestColorRule) {
                    getInputElement(obj.nestbgID).value = nestColorRule[nestRule].bgColor.toCSSColor('hex');
                }
            }
            document.getElementsByClassName(obj.demoCharNestID)[0].setAttribute('style', nestColorRule[nestRule].buildSpanStyle());
        }

        /**
         * @param {MatchColor} matchRule
         * @param {Object} obj
         */
        function updateTopOrBottom(matchRule, obj) {
            const disabled = matchRule.borderPosition === 'None';
            getInputElement(obj.thicknessID).disabled = disabled;
            getInputElement(obj.borderColorID).disabled = disabled;

            /** @type{HTMLSelectElement} */
            let el = document.getElementById(obj.styleID);
            for (let i = 0; i < el.options.length; i++) {
                el.options.item(i).selected = (el.options.item(i).text === matchRule.borderPosition);
            }

            el = document.getElementById(obj.thicknessID);
            for (let i = 0; i < el.options.length; i++) {
                el.options.item(i).selected = (el.options.item(i).text === matchRule.borderThickness);
            }

            if (matchRule.borderColor) {
                getInputElement(obj.borderColorID).value = matchRule.borderColor.toCSSColor('hex');;
            }
            if (matchRule.bgColor) {
                getInputElement(obj.bgColorID).value = matchRule.bgColor.toCSSColor('hex');
            }
            getInputElement(obj.insideID).setAttribute('style', matchRule.buildSpanStyle());
        }

        const that = this;
        updateLeftOrRightSide({
            open: true,
            charID: 'match-open-char',
            fgID:'match-area-fg-top',
            bgID:'match-area-bg-top',
            demoCharID: 'match-area-open-top',
            nestfgID: 'match-area-fg-bottom',
            nestbgID: 'match-area-bg-bottom',
            demoCharNestID: 'match-area-open-bottom'
        });
        updateLeftOrRightSide({
            open: false,
            charID: 'match-close-char',
            fgID:'match-area-r-fg-top',
            bgID:'match-area-r-bg-top',
            demoCharID: 'match-area-close-top',
            nestfgID: 'match-area-r-fg-bottom',
            nestbgID: 'match-area-r-bg-bottom',
            demoCharNestID: 'match-area-close-bottom'
        });

        const matchRule = this.matchMatch(getInputElement('match-open-char').innerText, true);
        updateTopOrBottom(matchRule.topMatchColor, {
            styleID: 'border-style-top',
            thicknessID: 'border-thickness-top',
            borderColorID: 'border-color-top',
            bgColorID: 'bg-top',
            insideID: 'match-area-contents-top'
        });
        updateTopOrBottom(matchRule.nestedMatchColor, {
            styleID: 'border-style-bottom',
            thicknessID: 'border-thickness-bottom',
            borderColorID: 'border-color-bottom',
            bgColorID: 'bg-bottom',
            insideID: 'match-area-contents-bottom'
})

    }

    updateTestInput() {
        const testArea = getInputElement('test-input');
        const caretOffset = getCaretPosition(testArea);
        testArea.innerHTML = this.convertToSpan(testArea.textContent);
        setCaretPosition(testArea, caretOffset);
    }
    
    updateAll() {
        this.updatePalettes();
        this.updateMatchArea();
        this.updateTestInput();
    }

    /**
     * 
     * @param {Object} ruleObj 
     * @returns {boolean}
     */
    looksLikeColoringRule(ruleObj) {
        return ruleObj['name'] && ruleObj['patterns'] && ruleObj['matches'];
    }

    rulesList() {
        let dataListElement = getInputElement('rulesList');
        dataListElement.innerHTML = '';

        const storage = window.localStorage;
        for (let i = 0; i < storage.length; i++) {
            const key = storage.key(i);
            let value;
            try {
                value = JSON.parse(storage.getItem(key));
            } catch(e) {
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
            const asString = JSON.stringify(this);
            storage.setItem(name, asString);
            storage.setItem(STORAGE_NAME__STARTUP_COLORING_RULES, name);
            this.saveStatus(true);
        }
        catch(err) {
            alert("Could not store rule!");
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

        ColoringRules.Rules = ColoringRules.readJSON(ruleObj);
        storage.setItem(STORAGE_NAME__STARTUP_COLORING_RULES, name);
        ColoringRules.Rules.saveStatus(true);
        ColoringRules.Rules.updateAll();
    }

    copyToClipboard() {
        navigator.clipboard.writeText(JSON.stringify(ColoringRules.Rules))
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
                const newRules = ColoringRules.readJSON(JSON.parse(result));
                if ('name' in newRules && 'patterns' in newRules && 'matches' in newRules) {
                    ColoringRules.Rules = newRules;
                    window.localStorage.setItem(STORAGE_NAME__STARTUP_COLORING_RULES, newRules.name);
                    ColoringRules.Rules.saveStatus(true);
                    ColoringRules.Rules.updateAll();    
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
        getInputElement('current-rule').innerText = message;
    }
}

// The global (permantent) instance of coloring rules
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
        // @type {string[]}
        this.state = [initState];
        this.current = 0;       // pointer to the current state (undo doesn't pop stat) -- normally this.state.length()-1
    }

    /**
     * 
     * @param {string} str  // the element this 
     */
    newState(str) {
        if (this.current + 1 < this.state.length) {
            this.state = this.state.slice(0, this.current + 1);
        }
        this.state.push(str);
        this.current++;
    }

    /**
     * @return {string} -- the new state or ''
     */
    redo() {
        if (this.current + 1 > this.state.length) {
            return '';
        } else {
            this.current++;
            return this.state[this.current];
        }
    }

    undo() {
        if (this.current < 1) {
            return '';
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
function getInputElement(id) {
    // @ts-ignore
    return document.getElementById(id);
}

/**
 * 
 * @param {boolean} charArea 
 * @param {boolean} matchArea 
 * @param {boolean} enabled 
 */
function setChangeCancelStatus(charArea, matchArea, enabled) {
    if (charArea) {
        document.getElementById('change').disabled = !enabled;
        document.getElementById('cancel').disabled = !enabled;
    }
    if (matchArea) {
        document.getElementById('change-match').disabled = !enabled;
        document.getElementById('cancel-match').disabled = !enabled;
    }
}

const EditAreaIds = ['edit-input', 'text-color', 'bg-color', 'font-style', 'spacing'];
const PaletteIds = ['lc-letters', 'uc-letters', 'digits', 'symbols', 'symbols-test'];
const OnClickIds = ['saveRules', 'loadRules', 'copyToClipboard', 'pasteFromClipboard', 'removeAllRules'];

EditHistory.testInput = new EditHistory( document.getElementById('test-input').textContent );
EditHistory.editInput = new EditHistory( document.getElementById('edit-input').textContent );

window.onload =
    function() {
        // get initial coloring rules
        const initColoringRuleName = window.localStorage.getItem(STORAGE_NAME__STARTUP_COLORING_RULES);
        if (initColoringRuleName) {
            new ColoringRules(initColoringRuleName).loadRules(initColoringRuleName);
            // loadRules sets saveStatus
        } else {
            ColoringRules.Rules = new ColoringRules(DEFAULT_RULE_NAME).initialize();
            ColoringRules.Rules.saveStatus(true); 
        }
        // add the palettes
        PaletteIds.forEach( palette => addCharacterPalette( document.getElementById(palette)) );

        let testInput = document.getElementById('test-input');
        testInput.addEventListener('input', updateTestArea.bind(EditHistory.testInput));

        let editInputArea = document.getElementById('edit-input');
        editInputArea.addEventListener('input', updateTestArea.bind(EditHistory.editInput));
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
            ColoringRules.Rules.saveStatus(false);
            setChangeCancelStatus(true, false, false);
        });
        document.getElementById('cancel').addEventListener('mousedown', function() {
            ColoringRules.Rules.updateAll();
            editInputArea.innerText = '';   // clear the work area input
            oppositeInputEditArea.value = '';
            setChangeCancelStatus(true, false, false);
        });

        document.getElementById('rule-list-input').addEventListener('focus', function() {
                ColoringRules.Rules.rulesList() });
        OnClickIds.forEach(
            id => document.getElementById(id).addEventListener('click', function() {
                ColoringRules.Rules[id]( getInputElement('rule-list-input').value ); })
        );

        setChangeCancelStatus(true, true, false);
        ColoringRules.Rules.updateAll();
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
    getInputElement('text-color').value = targetStyle.color ? new Color(targetStyle.color).toCSSColor('hex') : '#000000';
    getInputElement('bg-color').value = targetStyle.backgroundColor ? new Color(targetStyle.backgroundColor).toCSSColor('hex') : '#ffffff';
    getInputElement('font-style').value = targetStyle.fontStyle ? targetStyle.fontStyle : 
                                                  targetStyle.fontWeight ? targetStyle.fontWeight : 'normal';
    getInputElement('spacing').value = targetStyle.marginLeft ? targetStyle.marginLeft : '0em';
    setChangeCancelStatus(true, false, true);
}

/**
 * 
 * @param {InputEvent} e 
 */
function updateTestArea(e) {
    switch (e.inputType) {
        case 'historyRedo':
            e.preventDefault();
            const redoText = this.redo();
            if (redoText) {
                e.currentTarget.innerText = redoText;
            }
            break;
        case 'historyUndo':
            e.preventDefault();
            const undoText = this.undo();
            if (undoText) {
                e.currentTarget.innerText = undoText;
            }
            break;
        default:
            e.preventDefault();
            this.newState(e.currentTarget.textContent);
            break;
        }
    ColoringRules.Rules.updateTestInput();
}

/**
 * @param {HTMLElement} elementForChar
 * @returns {ColoringRules} 
 */
function gatherCharStyle(elementForChar) {
    const ruleValues = EditAreaIds.slice(1).map(  id => getInputElement(id).value);

    // create a rule based on those values and *add* it to a temporary set of rules
    let newRules = new ColoringRules('temp');
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
    let result = new ColoringRules('temp');;
    for (const ch of chars) {
        result.replace(result.escapeSpecialChars(ch), new ColorRule(ch, compForeground, compBackground, colorRule.style, colorRule.spacing));
    }

    return result;
}

/**
 * 
 * @param {Event} e 
 */
function updateCharStyle(e) {
    // gather up all the values that were set
    const elementForChar = getInputElement('edit-input')
    const editAreaRules = gatherCharStyle(elementForChar);

    const oppositeEditArea = getInputElement('opposite-input');
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
    } else if ( (sel = doc.selection) && sel.type != "Control") {
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
