/**
 * Playable divers. All three handle identically on purpose: the choice is about
 * who the player wants to be, never about who is better at the game.
 */

export const CHARACTERS = [
    {
        id: "coral",
        name: "Coral",
        trait: "Reads the water calmly",
        image: "climber-red",
        tint: "#e53e3e"
    },
    {
        id: "marina",
        name: "Marina",
        trait: "Never stops kicking",
        image: "climber-teal",
        tint: "#2c9c92"
    },
    {
        id: "finn",
        name: "Finn",
        trait: "Brave in the deep",
        image: "climber-orange",
        tint: "#dd6b20"
    }
];

export function getCharacter(id) {
    return CHARACTERS.find(function (character) {
        return character.id === id;
    }) || CHARACTERS[0];
}
