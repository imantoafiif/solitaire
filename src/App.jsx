import { useState, useCallback } from "react";
import { DragDropProvider, useDraggable, useDroppable } from "@dnd-kit/react";
import "./App.scss";

const SUIT_MAP = { hearts: "h", diamonds: "d", clubs: "c", spades: "s" };
const RANK_MAP = { A: "a", J: "j", Q: "q", K: "k" };

function getCardImage(rank, suit, isFaceUp) {
  if (!isFaceUp) {
    return "/face/flip.png";
  }
  const suitCode = SUIT_MAP[suit];
  const rankCode = RANK_MAP[rank] || rank.toLowerCase();
  return `/face/${suitCode}-${rankCode}.png`;
}

function Card({
  id,
  slotId,
  cardIndex,
  stackSize,
  droppable,
  draggable,
  rank,
  suit,
  faceUp,
}) {
  const isTopCard = cardIndex === stackSize - 1;
  // Only face up cards that are on top can be dragged
  const canDrag = isTopCard && draggable && faceUp;

  const { ref: draggableRef, isDragging } = useDraggable({
    id: `card-${id}`,
    data: { cardId: id, slotId, cardIndex },
    disabled: !canDrag,
  });

  const { ref: droppableRef, isDropTarget } = useDroppable({
    id: `card-drop-${id}`,
    data: { cardId: id, slotId, cardIndex },
    disabled: !droppable,
  });

  const setRefs = useCallback(
    (node) => {
      draggableRef(node);
      droppableRef(node);
    },
    [draggableRef, droppableRef],
  );

  const classNames = [
    "card",
    canDrag && "card--draggable",
    isDragging && "card--dragging",
    isDropTarget && "card--drop-target",
  ]
    .filter(Boolean)
    .join(" ");

  const style = {
    top: `${slotId > 6 ? cardIndex * 25 : cardIndex * 0.5}px`,
    zIndex: cardIndex,
    backgroundImage: `url(${getCardImage(rank, suit, faceUp)})`,
    backgroundSize: "cover",
  };

  return <div ref={setRefs} className={classNames} style={style} />;
}

function CardSlot({ id, cards, droppable, draggable, onClick }) {
  const isEmpty = cards.length === 0;

  const { ref: droppableRef, isDropTarget } = useDroppable({
    id: `slot-${id}`,
    data: { slotId: id, isSlot: true },
    disabled: !droppable,
  });

  const classNames = [
    "card-slot",
    isEmpty && droppable && "card-slot--empty-droppable",
    !droppable && "card-slot--not-droppable",
    isDropTarget && "card-slot--drop-target",
    onClick && "card-slot--clickable",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={droppableRef} className={classNames} onClick={onClick}>
      {cards.map((card, index) => (
        <Card
          key={card.id}
          id={card.id}
          slotId={id}
          cardIndex={index}
          stackSize={cards.length}
          droppable={droppable}
          draggable={draggable}
          rank={card.rank}
          suit={card.suit}
          faceUp={card.faceUp}
        />
      ))}
    </div>
  );
}

const SUITS = ["hearts", "diamonds", "clubs", "spades"];
const RANKS = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
];

function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ id: `${rank}-${suit}`, rank, suit, faceUp: false });
    }
  }
  // Shuffle the deck
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function initializeSlots() {
  const deck = createDeck();
  let cardIndex = 0;

  // Tableau distribution: slot 7 gets 1, slot 8 gets 2, ..., slot 13 gets 7
  const tableauCounts = { 7: 1, 8: 2, 9: 3, 10: 4, 11: 5, 12: 6, 13: 7 };

  return Array.from({ length: 14 }, (_, index) => {
    let cards = [];

    if (tableauCounts[index]) {
      // Tableau slots (7-13)
      cards = deck
        .slice(cardIndex, cardIndex + tableauCounts[index])
        .map((card, i, arr) => ({
          ...card,
          // Only the topmost card is face up
          faceUp: i === arr.length - 1,
        }));
      cardIndex += tableauCounts[index];
    }

    return {
      id: index,
      cards,
      isDropTarget: ![0, 1, 2].includes(index),
      isDraggable: index > 0,
    };
  }).map((slot) => {
    // Put remaining cards in slot 0 (all face down)
    if (slot.id === 0) {
      return { ...slot, cards: deck.slice(cardIndex) };
    }
    return slot;
  });
}

const RANK_ORDER = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
];

function getRankIndex(rank) {
  return RANK_ORDER.indexOf(rank);
}

function canDropOnFoundation(foundationCards, cardToDrop) {
  // If foundation is empty, only Ace can be dropped
  if (foundationCards.length === 0) {
    return cardToDrop.rank === "A";
  }

  // Get the top card of the foundation
  const topCard = foundationCards[foundationCards.length - 1];

  // Must be same suit
  if (topCard.suit !== cardToDrop.suit) {
    return false;
  }

  // Must be next rank in sequence
  const topRankIndex = getRankIndex(topCard.rank);
  const dropRankIndex = getRankIndex(cardToDrop.rank);

  return dropRankIndex === topRankIndex + 1;
}

function App() {
  const [slots, setSlots] = useState(initializeSlots);

  const handleDrawCard = useCallback(() => {
    setSlots((prevSlots) => {
      const stockSlot = prevSlots[0];
      if (stockSlot.cards.length === 0) return prevSlots;

      const newSlots = prevSlots.map((slot) => ({
        ...slot,
        cards: [...slot.cards],
      }));

      // Take the top card from slot 0 and flip it face up
      const cardToMove = { ...newSlots[0].cards.pop(), faceUp: true };

      // Add it to slot 1
      newSlots[1].cards.push(cardToMove);

      return newSlots;
    });
  }, []);

  const handleDragEnd = useCallback((event) => {
    const { source, target } = event.operation;

    if (!source || !target) return;

    const sourceSlotId = source.data?.slotId;
    const sourceCardIndex = source.data?.cardIndex;
    const targetSlotId = target.data?.slotId;

    if (sourceSlotId === undefined || targetSlotId === undefined) return;
    if (sourceSlotId === targetSlotId) return;

    // Prevent cards in slots 3-6 from being dropped on each other
    const foundationSlots = [3, 4, 5, 6];
    const sourceIsFoundation = foundationSlots.includes(sourceSlotId);
    const targetIsFoundation = foundationSlots.includes(targetSlotId);

    if (sourceIsFoundation && targetIsFoundation) return;

    setSlots((prevSlots) => {
      const newSlots = prevSlots.map((slot) => ({
        ...slot,
        cards: slot.cards.map((card) => ({ ...card })),
      }));

      const sourceSlot = newSlots[sourceSlotId];
      const targetSlot = newSlots[targetSlotId];

      // Get cards to move (from the dragged card to the end of the stack)
      const cardsToMove = sourceSlot.cards.slice(sourceCardIndex);

      // Foundation validation: only one card at a time and must follow rules
      if (targetIsFoundation) {
        // Only one card can be moved to foundation at a time
        if (cardsToMove.length !== 1) {
          return prevSlots;
        }

        // Check if the card can be dropped on this foundation
        if (!canDropOnFoundation(targetSlot.cards, cardsToMove[0])) {
          return prevSlots;
        }
      }

      // Actually remove the cards from source
      sourceSlot.cards.splice(sourceCardIndex);

      // Cards moved should be face up
      const cardsToMoveWithFaceUp = cardsToMove.map((card) => ({
        ...card,
        faceUp: true,
      }));

      // Add cards to target slot
      targetSlot.cards.push(...cardsToMoveWithFaceUp);

      // Flip the new topmost card in source slot if it's a tableau slot (7-13)
      if (
        sourceSlotId >= 7 &&
        sourceSlotId <= 13 &&
        sourceSlot.cards.length > 0
      ) {
        const topCard = sourceSlot.cards[sourceSlot.cards.length - 1];
        if (!topCard.faceUp) {
          topCard.faceUp = true;
        }
      }

      return newSlots;
    });
  }, []);

  return (
    <DragDropProvider onDragEnd={handleDragEnd}>
      <div className="app-canvas">
        {slots.map((slot) => (
          <CardSlot
            key={`slot-${slot.id}`}
            id={slot.id}
            cards={slot.cards}
            droppable={slot.isDropTarget}
            draggable={slot.isDraggable}
            onClick={slot.id === 0 ? handleDrawCard : undefined}
          />
        ))}
      </div>
    </DragDropProvider>
  );
}

export default App;
