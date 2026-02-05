import {CSSProperties, DragEvent, JSX, useRef, useState} from "react";

import './ItemListChooser.css';
import {moveElement} from "@/ReactAPM/ToolBox/ArrayTools";
import {Button} from "react-bootstrap";

interface ItemChooserProps {
  itemPool: string[];
  chosenItems: string[];
  onChosenItemsChange: (chosenItems: string[]) => void;
  poolLabel?: string;
  chosenLabel?: string;
  showChooseAllButton?: boolean;
  showChooseNoneButton?: boolean;
  style?: CSSProperties;
}

interface DraggedItem {
  item: string;
  itemInPool: boolean;
}

const StyleDragOver = 'background-color: silver;'
const StyleDragExit = 'background-color: inherit;'

/**
 * A component that allows the user to choose items from a list by
 * dragging them into a target area.
 *
 * @constructor
 */
export function ItemListChooser(props: ItemChooserProps) {

  const [draggedItem, setDraggedItem] = useState<DraggedItem | null>(null);

  const itemsInPool = props.itemPool.filter(item => !props.chosenItems.includes(item));
  const poolDivRef = useRef<HTMLDivElement|null>(null);
  const poolLabel = props.poolLabel ?? 'Available';
  const chosenLabel = props.chosenLabel ?? 'Chosen';
  const showChooseAllButton = props.showChooseAllButton ?? true;
  const showChooseNoneButton = props.showChooseNoneButton ?? true;


  const setChosenItems = (newChosenItems: string[]) => {
    props.onChosenItemsChange(newChosenItems);
  }
  const handleDragStart = (item: string, itemInPool: boolean) => {
    setDraggedItem({item: item, itemInPool: itemInPool});
  };


  const handleDropInPool = () => {
    if (draggedItem === null) {
      return;
    }
    setChosenItems(props.chosenItems.filter(ci => ci !== draggedItem.item));
    if (poolDivRef.current !== null) {
      poolDivRef.current.style = StyleDragExit;
    }
    setDraggedItem(null);
  };

  const handleDropInChosenItems = (ev: DragEvent<HTMLElement>, targetItemIndex: number) => {
    ev.currentTarget.style = 'background-color: inherit';
    // this handles drops into the 'pre' divs of the chosen items list
    if (draggedItem === null) {
      return;
    }
    if (draggedItem.itemInPool) {
      setChosenItems([...props.chosenItems.slice(0, targetItemIndex), draggedItem.item, ...props.chosenItems.slice(targetItemIndex, props.chosenItems.length)]);
    } else {
      // just changing order in chosen items
      const draggedItemIndex = props.chosenItems.indexOf(draggedItem.item);
      targetItemIndex = Math.min(targetItemIndex, props.chosenItems.length);
      if (draggedItemIndex !== targetItemIndex) {
        console.log(`Moving item ${draggedItemIndex} (${draggedItem.item}) to index ${targetItemIndex}`);
        setChosenItems(moveElement(props.chosenItems, draggedItemIndex, targetItemIndex));
      }
      // else: dragging an item before itself or before the next item, so nothing to do
    }
    setDraggedItem(null);
  };

  const handleDragOverInChosenItems = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.currentTarget.style = StyleDragOver;
  };

  const handleDragExitInChosenItems = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.currentTarget.style = StyleDragExit;
  };

  const handleDragOverInPool = (ev: DragEvent<HTMLElement>) => {
    if (draggedItem === null || draggedItem.itemInPool) {
      return;
    }
    ev.preventDefault();
    if (poolDivRef.current === null) {
      return;
    }
    poolDivRef.current.style = StyleDragOver;
  }

  const handleDragExitInPool = (ev: DragEvent<HTMLElement>) => {
    ev.preventDefault();
    if (poolDivRef.current === null) {
      return;
    }
    poolDivRef.current.style = StyleDragExit;
  }

  const userDivStyle = props.style ?? {};
  const divStyle: CSSProperties = {display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1em'};

  const poolDivs: JSX.Element[] = [];
  for (let i = 0; i < itemsInPool.length; i++) {
    poolDivs.push(<div key={'preItem-' + i}
                       className="interItem"
                       onDragOver={handleDragOverInPool}
                       onDragExit={handleDragExitInPool}
                       onDrop={handleDropInPool}/>);
    const item = itemsInPool[i];
    poolDivs.push(<div key={item}
                       className="item"
                       draggable
                       onDragOver={handleDragOverInPool}
                       onDragExit={handleDragExitInPool}
                       onDragStart={() => handleDragStart(item, true)}
                       onDrop={handleDropInPool}>
      {item}
    </div>);
  }
  poolDivs.push(<div key={'postList'}
                     className="postList"
                     onDragOver={handleDragOverInPool}
                     onDragExit={handleDragExitInPool}
                     onDrop={handleDropInPool}/>);

  const chosenDivs: JSX.Element[] = [];
  for (let i = 0; i < props.chosenItems.length; i++) {
    chosenDivs.push(<div key={'preItem' + i}
                         className="interItem"
                         onDragOver={handleDragOverInChosenItems}
                         onDragExit={handleDragExitInChosenItems}
                         onDrop={(ev) => handleDropInChosenItems(ev, i)}
    />);
    const item = props.chosenItems[i];
    chosenDivs.push(<div key={item}
                         className="item"
                         draggable
                         onDragStart={() => handleDragStart(item, false)}>
      {item}
    </div>);
  }
  chosenDivs.push(<div key={'postList'}
                       className="postList"
                       onDragOver={handleDragOverInChosenItems}
                       onDragExit={handleDragExitInChosenItems}
                       onDrop={(e) => handleDropInChosenItems(e, props.chosenItems.length)}
  />);


  return <div style={{...userDivStyle, ...divStyle}}>
    <div className="listLabelDiv"><span className={'listLabel'}>{poolLabel}</span></div>
    <div className="listLabelDiv">
      <span className={'listLabel'}>{chosenLabel}</span>
      {showChooseAllButton && <Button variant='outline-secondary' size='sm' onClick={() => setChosenItems(props.itemPool)}>All</Button>}
      {showChooseNoneButton && <Button variant='outline-secondary' size='sm' onClick={() => setChosenItems([])}>None</Button>}
    </div>
    <div className="listContainer pool" ref={poolDivRef}>
      {poolDivs}
    </div>
    <div className="listContainer chosen">
      {chosenDivs}
    </div>
  </div>;

}