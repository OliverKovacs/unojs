// Oliver Kovacs - unojs - MIT

const TYPE_MASK  =  15;     // 0000 1111
const COLOR_MASK =  48;     // 0011 0000
const WILD_MASK  =  64;     // 0100 0000
const EXT_MASK   = 192;     // 1100 0000

const COLOR_LOOKUP = {
    r    :     0,           // 0000 0000
    g    :    16,           // 0001 0000
    b    :    32,           // 0010 0000
    y    :    48,           // 0011 0000
    "0"  :   "r",           // 0000 0000
    "16" :   "g",           // 0001 0000
    "32" :   "b",           // 0010 0000
    "48" :   "y",           // 0011 0000
};

const CARD_LOOKUP = {
    "r"  :    10,           // 0000 1100
    "s"  :    11,           // 0000 1101
    "+2" :    12,           // 0000 1110
    "w"  :   128,           // 0100 0000
    "w+4":   192,           // 1100 0000
    "10" :   "r",           // 0000 1100
    "11" :   "s",           // 0000 1101
    "12" :  "+2",           // 0000 1110
    "128":   "w",           // 0100 0000
    "192": "w+4",           // 1100 0000
};

module.exports = class UNO {

    config = { initial_cards: 7 };

    constructor(config) {
        this.config = { ...this.config, ...config };
        this.stack     = [];
        this.cards     = [];
        this.lookup    = [];
        this.players   = {};
        this.current   = 0;
        this.direction = 1;
        this.penalty   = 0;
        this.isStarted = false;
    }

    log(...args)   { console.log(...args);   }
    error(...args) { console.error(...args); }

    get index() {
        const n = this.lookup.length;
        return ((this.current % n) + n) % n;
    }

    join(name) {
        if (this.isStarted) return this.error("already started");
        if (this.lookup.includes(name)) return this.error("already joined")
        this.lookup.push(name);
        this.players[name] = [];
    }

    start() {
        this.createCards();
        this.dealCards();
        this.isStarted = true;
    }

    next(name, string) {
        if (!this.isStarted) this.error("not started");
        const deck = this.players[name]
        if (!deck) return this.error("player doesn't exist");
        if (name !== this.lookup[this.index]) return this.error("not current player");
        if (string === "pickup") {
            deck.push(...this.cards.splice(-1 - this.penalty));
            this.penalty = 0;
            this.current += this.direction;
            return;
        }
        const card = this.cardToNumber(string);
        if (!this.includes(deck, card)) return this.error("player doesn't have the card");
        const last = this.stack.slice(-1);
        if ((card & COLOR_MASK !== last & COLOR_MASK) &&
            (card & TYPE_MASK  !== last & TYPE_MASK ) &&
            (card & WILD_MASK  !== WILD_MASK)) return this.error("invalid card");
        this.stack.push(deck.splice(this.indexOf(deck, card), 1));
        if (!deck.length) {
            this.log(`${name} won`);
            this.lookup.splice(this.lookup.indexOf(name), 1);
        }
        if (card & TYPE_MASK === CARD_LOOKUP["r"]) this.direction *= -1;
        if (this.penalty && ((card & TYPE_MASK) !== CARD_LOOKUP["+2"]) && ((card & EXT_MASK) !== CARD_LOOKUP["w+4"])) {
            deck.push(...this.cards.splice(-this.penalty));
            this.penalty = 0;
        }
        this.penalty += 2 * ((card & TYPE_MASK) === CARD_LOOKUP["+2"]);
        this.penalty += 4 * ((card & EXT_MASK) === CARD_LOOKUP["w+4"]);
        this.current += this.direction * (1 + (card & TYPE_MASK === CARD_LOOKUP["s"]));
        this.log(`[${string}] ${this.lookup[this.index]} is the next player`);
    }
    
    cardToNumber(card) {
        const type = card.slice(1).replace(/\s+/g, "");
        return COLOR_LOOKUP[card[0]] | (CARD_LOOKUP[type] ? CARD_LOOKUP[type] : +type);
    }

    numberToCard(number) {
        return COLOR_LOOKUP[number & COLOR_MASK] + 
            (CARD_LOOKUP[number & EXT_MASK] ?? CARD_LOOKUP[number & TYPE_MASK] ?? number & TYPE_MASK);
    }

    compare(card1, card2) {
        return card1 === card2 || (card1 & EXT_MASK) === (card2 & EXT_MASK);
    }

    includes(array, card) {
        return array.reduce((prev, curr) => prev || this.compare(card, curr), false);
    }

    indexOf(array, card) {
        for (let i = 0; i < array.length; i++) {
            if (this.compare(card, array[i])) return i;
        }
        return -1;
    }

    createCards() {
        let tmp = [];
        for (let i = 0; i < 13; i++) {
            for (let j = 0; j < 4; j++) {
                tmp[(i * 4 + j) * 2    ] = (j << 4) | i;
                tmp[(i * 4 + j) * 2 + 1] = (j << 4) | i;
            }
        }
        for (let i = 0; i < 4; i++) {
            tmp[13 * 4 * 2 + i * 2    ] = CARD_LOOKUP["w"];
            tmp[13 * 4 * 2 + i * 2 + 1] = CARD_LOOKUP["w+4"];
        }
        while (tmp.length) {
            this.cards.push(...tmp.splice(Math.floor(Math.random() * tmp.length), 1))
        }
    }

    dealCards() {
        for (let i = 0; i < this.lookup.length; i++) {
            this.players[this.lookup[i]].push(...this.cards.splice(-this.config.initial_cards));
        }
    }
}
