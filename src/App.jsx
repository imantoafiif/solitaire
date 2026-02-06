import { useState, useCallback } from "react";
import { DragDropProvider, useDraggable, useDroppable } from "@dnd-kit/react";
import "./App.scss";

function Card({ id, slotId, cardIndex, stackSize, droppable, draggable }) {
  const isTopCard = cardIndex === stackSize - 1;
  const canDrag = isTopCard && draggable;

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
    [draggableRef, droppableRef]
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
    top: `${slotId > 6 ? cardIndex * 25 : 0}px`,
    zIndex: cardIndex,
  };

  return (
    <div ref={setRefs} className={classNames} style={style}>
      <p>{id}</p>
    </div>
  );
}

function CardSlot({ id, cards, droppable, draggable }) {
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
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={droppableRef} className={classNames}>
      {cards.map((card, index) => (
        <Card
          key={card.id}
          id={card.id}
          slotId={id}
          cardIndex={index}
          stackSize={cards.length}
          droppable={droppable}
          draggable={draggable}
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
      deck.push({ id: `${rank}-${suit}`, rank, suit });
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
      cards = deck.slice(cardIndex, cardIndex + tableauCounts[index]);
      cardIndex += tableauCounts[index];
    }

    return {
      id: index,
      cards,
      isDropTarget: ![0, 1, 2].includes(index),
      isDraggable: index > 0,
    };
  }).map((slot, _, allSlots) => {
    // Put remaining cards in slot 0
    if (slot.id === 0) {
      return { ...slot, cards: deck.slice(cardIndex) };
    }
    return slot;
  });
}

function App() {
  const [slots, setSlots] = useState(initializeSlots);

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
        cards: [...slot.cards],
      }));

      const sourceSlot = newSlots[sourceSlotId];
      const targetSlot = newSlots[targetSlotId];

      // Get cards to move (from the dragged card to the end of the stack)
      const cardsToMove = sourceSlot.cards.splice(sourceCardIndex);

      // Add cards to target slot
      targetSlot.cards.push(...cardsToMove);

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
          />
        ))}
      </div>
    </DragDropProvider>
  );
}

export default App;
