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

function App() {
  const [slots, setSlots] = useState(() =>
    Array.from({ length: 14 }, (_, index) => {
      const isEmpty = index === 1 || index === 2;
      return {
        id: index,
        cards: isEmpty ? [] : [{ id: `card-${index}-0` }],
        isDropTarget: ![0, 1, 2].includes(index),
        isDraggable: index > 0,
      };
    })
  );

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
