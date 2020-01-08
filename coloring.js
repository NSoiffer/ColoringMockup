// @ts-check
/* -*- Mode: Java; tab-width: 4; indent-tabs-mode:nil; c-basic-offset: 4 -*- */
/* vim: set ts=4 et sw=4 tw=80: */

class ColorRule {
    /**
     * 
     * @param {string} pattern 
     * @param {string} fgColor
     * @param {string} bgColor 
     * @param {string} style 
     * @param {string} spacing 
     */
    constructor(pattern, fgColor, bgColor, style, spacing) {
        this.pattern = new RegExp(pattern);
        this.fgColor = fgColor;
        this.bgColor = bgColor;
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
            style += ` color: ${this.fgColor};`;
        }
        if (this.bgColor) {
            style += ` background-color: ${this.bgColor};`;
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
    
    /**
     * 
     * @param {string} color 
     * @returns {string} 
     */
    convertToHSL(color) {
        // FIX: implement this
        console.log('Color.converToHSL not yet implemented');
        return color;
    }
}


class ColoringRules {
    constructor() {
        /** @type {ColorRule[]} */
        this.patterns = [];
        this.initialize();
    }

    /**
     * @returns {ColoringRules}
     */
    clone() {
        let newRules = new ColoringRules();
        newRules.patterns = Object.assign([], this.patterns);
        return newRules;
    }

    initialize() {
        this.patterns.push( new ColorRule('3', 'hsl(130, 70%, 43%)', 'hsl(4, 90%, 50%)', 'normal', '') );
        this.patterns.push( new ColorRule('8', 'hsl(4, 90%, 50%)', 'hsl(130, 70%, 43%)', 'normal', '') );
        this.patterns.push( new ColorRule('[0-9]', '', '', 'normal', '') );
        this.patterns.push( new ColorRule('[a-zA-Z]', '', '', 'italic', '') );
        this.patterns.push( new ColorRule('\\+|×|÷|±', '', '', 'normal', '.222em') );
        this.patterns.push( new ColorRule('-', '', '', 'bold', '.222em') );
        this.patterns.push( new ColorRule('\\|', '', '', 'bold', '') );
        this.patterns.push( new ColorRule('<|=|>|≠|≤|≥', 'hsl(0,0%,100%)', 'hsl(160, 10%, 10%)', 'normal', '.278em') );
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
}

// The global (permantent) instance of coloring rules
ColoringRules.Rules = new ColoringRules();



const EditAreaIds = ['edit-input', 'text-color', 'bg-color', 'font-style', 'spacing'];
const PaletteIds = ['lc-letters', 'uc-letters', 'digits', 'symbols']
window.onload =
    function() {
        // add the palettes
        PaletteIds.forEach( palette => addCharacterPalette(document.getElementById(palette)) );

        let inputArea = document.getElementById('color-input');
        inputArea.addEventListener('keydown', updateTestArea);
        document.getElementById('edit-input').addEventListener('keydown', updateTestArea);

        EditAreaIds.forEach(
            id => document.getElementById(id).addEventListener('input', updateCharStyle));       

        // useful for demo at the moment
        inputArea.innerHTML = ColoringRules.Rules.convertToSpan(inputArea.textContent);
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
        button.onclick = copyCharToEditArea;
        grid.appendChild(button);
    } );
}

function toNumericColor(rgbColor) {
    const numbers = rgbColor.match(/rgb\((\d+), (\d+), (\d+)\)/).slice(1);
    const asHex =  numbers.map( num => parseInt(num).toString(16));

    return '#'+ asHex.map(str => str.length===1 ? '0'+str : str).join('')
}

/**
 * 
 * @param {MouseEvent} ev 
 */
function copyCharToEditArea(ev) {
    let target = document.getElementById('edit-input');
    target.innerHTML = ColoringRules.Rules.convertToSpan(this.innerText);

    // update the edit area fields
    let targetStyle = target.children[0].style;
    document.getElementById('text-color').value = targetStyle.color ? toNumericColor(targetStyle.color) : '#000000';
    document.getElementById('bg-color').value = targetStyle.backgroundColor ? toNumericColor(targetStyle.backgroundColor) : '#ffffff';
    document.getElementById('font-style').value = targetStyle.fontStyle ? targetStyle.fontStyle : 
                                                  targetStyle.fontWeight ? targetStyle.fontWeight : 'normal';
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
    }
}

/**
 * 
 * @param {Event} e 
 */
function updateCharStyle(e) {
    // gather up all the values that were set
    let elementForChar = document.getElementById('edit-input');     // not an input field, so can't use value
    // @ts-ignore '.value' is issue
    const ruleValues = EditAreaIds.slice(1).map(  id => document.getElementById(id).value);

    // create a rule based on those values and *add* it to a temporary set of rules
    let tempColoringRules = ColoringRules.Rules.clone();

    for (const ch of elementForChar.innerText.split('')) {      // for loop because there could be more than one char
        // @ts-ignore
        const newRule = new ColorRule( ...[ColoringRules.Rules.escapeSpecialChars(ch)].concat(ruleValues) );    
        tempColoringRules.replace(ch, newRule);
    }

    // @ts-ignore
    if (typeof e.inputType !== 'undefined') {
        // typing directly in the field
        e.preventDefault();
        document.execCommand('insertHTML', false, ColoringRules.Rules.convertToSpan(elementForChar.innerText));
    } else {
        // change of values
        elementForChar.innerHTML = tempColoringRules.convertToSpan(elementForChar.innerText);
    }


    tempColoringRules.updatePalettes();
    
    const testArea = document.getElementById('color-input');
    testArea.innerHTML = tempColoringRules.convertToSpan(testArea.innerText);
}