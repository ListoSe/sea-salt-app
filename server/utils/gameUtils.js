export const shuffle = (array) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

export const getRoomData = (room) => ({
    discards: room.discards,
    deckCount: room.deck.length,
    nextTurn: room.currentTurn,
    hasDrawn: room.hasDrawn,
    handCounts: room.players.reduce((acc, id) => {
        acc[id] = room.hands[id].length;
        return acc;
    }, {})
});