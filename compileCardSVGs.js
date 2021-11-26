// @ts-check
// Saves time by compiling card SVGs from suit and rank templates I did in illustrator
// Works on 500 wide by 700 high SVG components
// Expects a `card-components` directory containing `suits` and `ranks` directories
// The `suits` directory has, for example, `clubs-s.svg` and `clubs-m.svg` files
// The `ranks` directory has, for example, `7-s.svg` and `7-m.svg` files
// Outputs the `cardComponents` object used in `Card.svelte`
const fs = require('fs');
const path = require('path');

const suits = ['clubs', 'diamonds', 'hearts', 'spades'];
const ranks = ['ace', 2, 3, 4, 5, 6, 7, 8, 9, 10, 'jack', 'queen', 'king'];
const finalStrings = { s: {}, m: {}};

// Small suits
suits.forEach(suit => {
    const smallSuit = fs.readFileSync(path.resolve('card-components', 'suits', `${suit}-s.svg`), { encoding: "utf-8"});
    const smallSuitCleanPath = smallSuit.trim().split('\n').map(line => line.trim())[9].replace(' class="a" ', ' ');
    finalStrings["s"][suit] = smallSuitCleanPath;
});

// Small ranks
ranks.forEach(rank => {
    const smallRank = fs.readFileSync(path.resolve('card-components', 'ranks', `${rank}-s.svg`), { encoding: "utf-8"});
    let smallRankCleanPath = smallRank.trim().split('\n').map(line => line.trim())[9].replace(' class="a" ', ' ');
    if (rank === 10) {
        smallRankCleanPath = smallRank.trim().split('\n').map(line => line.trim().replace(' class="a" ', ' ')).slice(10, 12).join('');
    }
    finalStrings["s"][rank] = smallRankCleanPath;
});

// Small joker
const smallJoker = fs.readFileSync(path.resolve('card-components', 'ranks', `joker-s.svg`), { encoding: "utf-8"});
const smallJokerCleanPath = smallJoker.trim().split('\n').filter(line => line.includes('path')).map(line => line.trim().replace(' class="a" ', ' ')).join('');
finalStrings["s"]["joker"] = smallJokerCleanPath;

// Medium suits
suits.forEach(suit => {
    const mediumSuit = fs.readFileSync(path.resolve('card-components', 'suits', `${suit}-m.svg`), { encoding: "utf-8"});
    const mediumSuitCleanPath = mediumSuit.trim().split('\n').map(line => line.trim().replace(' class="a" ', ' ')).slice(10, 13).join('');
    finalStrings["m"][suit] = mediumSuitCleanPath;
});

// Medium ranks
ranks.forEach(rank => {
    const mediumRank = fs.readFileSync(path.resolve('card-components', 'ranks', `${rank}-m.svg`), { encoding: "utf-8"});
    let mediumRankCleanPath = mediumRank.trim().split('\n').map(line => line.trim().replace(' class="a" ', ' ')).slice(10, 12).join('');
    // Need lines 11, 12, 15, 16
    if (rank === 10) {
        const mediumRankParts = mediumRank.trim().split('\n').map(line => line.trim().replace(' class="a" ', ' '));
        mediumRankCleanPath = `${mediumRankParts[11]}${mediumRankParts[12]}${mediumRankParts[15]}${mediumRankParts[16]}`
    }
    finalStrings["m"][rank] = mediumRankCleanPath;
});

// Medium joker
const mediumJoker = fs.readFileSync(path.resolve('card-components', 'ranks', `joker-m.svg`), { encoding: "utf-8"});
const mediumJokerCleanPath = mediumJoker.trim().split('\n').filter(line => line.includes('path')).map(line => line.trim().replace(' class="a" ', ' ')).join('');
finalStrings["m"]["joker"] = mediumJokerCleanPath;

console.log(finalStrings);
