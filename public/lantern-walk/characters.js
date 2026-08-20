/**
 * Playable walkers. All three walk identically; the choice is who the player
 * wants to be. The tint colours their coat in the 3D scene.
 */

export const CHARACTERS = [
    {
        id: "wren",
        name: "Wren",
        trait: "Calm in the dark",
        coat: "#c0562f",
        skin: "#e8b98f"
    },
    {
        id: "juniper",
        name: "Juniper",
        trait: "Looks after herself",
        coat: "#2f7d6b",
        skin: "#d79a74"
    },
    {
        id: "rowan",
        name: "Rowan",
        trait: "Keeps a steady pace",
        coat: "#3b5ea8",
        skin: "#c98d68"
    }
];

export function getCharacter(id) {
    return CHARACTERS.find(function (character) {
        return character.id === id;
    }) || CHARACTERS[0];
}
