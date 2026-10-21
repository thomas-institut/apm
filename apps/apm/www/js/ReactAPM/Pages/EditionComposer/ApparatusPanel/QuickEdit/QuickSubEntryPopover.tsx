import {ReactNode, useEffect, useId, useRef, useState} from "react";
import type {ComponentProps} from "react";
import {Button, OverlayTrigger, Popover} from "react-bootstrap";
import {OverlayInjectedProps} from "react-bootstrap/types";
import {ApparatusEntry} from "@/Edition/ApparatusEntry";
import {SiglaGroup} from "@/Edition/SiglaGroup";
import QuickSubEntryForm from "@/ReactAPM/Pages/EditionComposer/ApparatusPanel/QuickEdit/QuickSubEntryForm";
import {
  QuickEditOutcome,
  QuickSubEntryData
} from "@/ReactAPM/Pages/EditionComposer/ApparatusPanel/QuickEdit/QuickApparatusEditUtil";

interface QuickSubEntryPopoverProps {
  triggerContent: ReactNode;
  triggerClassName?: string;
  triggerSize?: ComponentProps<typeof Button>['size'];
  triggerVariant?: ComponentProps<typeof Button>['variant'];
  triggerLabel: string;
  triggerTitle?: string;
  disabled?: boolean;
  sigla: string[];
  witnessOrder: number[];
  siglaGroups: SiglaGroup[];
  lemma: string;
  targetEntry: ApparatusEntry | null;
  lang: string;
  onQuickAdd: (data: QuickSubEntryData) => Promise<QuickEditOutcome>;
  onEnableExisting?: (subEntryIndex: number) => Promise<QuickEditOutcome>;
  /** Called with true when the form is shown and with false when it is closed (or the component unmounts) */
  onOpenChange?: (isOpen: boolean) => void;
}

/** A quick-add button with its form displayed in a popover. */
export default function QuickSubEntryPopover({triggerContent, triggerClassName, triggerSize, triggerVariant, triggerLabel,
                                               triggerTitle, disabled = false, sigla, witnessOrder, siglaGroups, lemma,
                                               targetEntry, lang, onQuickAdd, onEnableExisting,
                                               onOpenChange}: QuickSubEntryPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = useId();
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    onOpenChangeRef.current?.(true);
    return () => onOpenChangeRef.current?.(false);
  }, [isOpen]);

  const close = () => {
    setIsOpen(false);
    setError(null);
  };

  const finish = async (promise: Promise<QuickEditOutcome>) => {
    const outcome = await promise;
    if (outcome === true) {
      close();
    } else {
      setError(outcome);
    }
  };

  const popover = (popoverProps: OverlayInjectedProps) => (
    <Popover {...popoverProps} id={`quick-sub-entry-popover-${id}`} className="quick-sub-entry-popover">
      <Popover.Header as="h3">Quick add: {lemma}</Popover.Header>
      <Popover.Body>
        <QuickSubEntryForm sigla={sigla} witnessOrder={witnessOrder} siglaGroups={siglaGroups}
                           targetEntry={targetEntry} lang={lang} onCancel={close}
                           onEnableExisting={onEnableExisting === undefined ? undefined : (index) =>
                             finish(onEnableExisting(index))}
                           onConfirm={(data) => finish(onQuickAdd(data))}/>
        {error !== null && <div className="text-danger quick-edit-error">{error}</div>}
      </Popover.Body>
    </Popover>
  );

  return <OverlayTrigger trigger={["click"]} placement="bottom" show={isOpen}
                         onToggle={(nextShow) => nextShow && setIsOpen(true)}
                         overlay={popover}>
    <Button size={triggerSize} variant={triggerVariant} className={triggerClassName} aria-label={triggerLabel}
            title={triggerTitle ?? triggerLabel} disabled={disabled}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setError(null);
            }}>{triggerContent}</Button>
  </OverlayTrigger>;
}