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

        EditAreaIds.forEach(
            id => document.getElementById(id).addEventListener('input', updateCharStyle));
            
            document.getElementById('change').addEventListener('mousedown', function() {
                ColoringRules.Rules = ColoringRules.Rules.merge(gatherCharStyle(editInputArea));
                ColoringRules.Rules.updateAll();
                editInputArea.innerText = '';   // clear the work area input
            });
            document.getElementById('cancel').addEventListener('mousedown', function() {
                ColoringRules.Rules.updateAll();
                editInputArea.innerText = '';   // clear the work area input
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
 * Convert a string of the form rgb(dec, dec, dec) to #rrggbb
 * @param {string} rgbColor 
 * @return {string}
 */
function toNumericColor(rgbColor) {
    const numbers = rgbColor.match(/rgb\((\d+), (\d+), (\d+)\)/).slice(1);
    const asHex =  numbers.map( num => parseInt(num).toString(16));

    return '#'+ asHex.map(str => str.length===1 ? '0'+str : str).join('')
}

/**
 * 
 * @param {MouseEvent} ev 
 */
function copyCharToTestArea(ev) {
    ev.preventDefault();
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
    let targetStyle = editInputArea.children[0].style;
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

    for (const ch of elementForChar.innerText.split('')) {      // for loop because there could be more than one char
        // @ts-ignore
        const newRule = new ColorRule( ...[newRules.escapeSpecialChars(ch)].concat(ruleValues) );    
        newRules.replace(ch, newRule);
    }
    return newRules;
}

/**
 * 
 * @param {Event} e 
 */
function updateCharStyle(e) {
    // gather up all the values that were set
    const elementForChar = document.getElementById('edit-input')
    const tempColoringRules = ColoringRules.Rules.merge(gatherCharStyle(elementForChar));
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
}