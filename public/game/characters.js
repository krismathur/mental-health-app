/**
 * Playable climbers. All three handle identically on purpose: the choice is
 * about who the player wants to be, never about who is better at the game.
 */

export const CHARACTERS = [
    {
        id: "rio",
        name: "Rio",
        trait: "Loves a tricky puzzle",
        image: "climber-red",
        tint: "#e53e3e"
    },
    {
        id: "nova",
        name: "Nova",
        trait: "Never stops trying",
        image: "climber-teal",
        tint: "#2c9c92"
    },
    {
        id: "ace",
        name: "Ace",
        trait: "Brave on the big jumps",
        image: "climber-orange",
        tint: "#dd6b20"
    }
];

export function getCharacter(id) {
    return CHARACTERS.find(function (character) {
        return character.id === id;
    }) || CHARACTERS[0];
}
