import {useCallback, useEffect, useRef, useState} from 'react';
import {Button, Form, Spinner} from 'react-bootstrap';
import {FmtText} from '@thomas-inst/fmt-text';
import {CtDataInterface, WitnessTokenInterface} from '@/CtData/CtDataInterface';
import {MainTextToken} from '@/Edition/MainTextToken';
import {WitnessToken} from '@/Witness/WitnessToken';
import {
  calculateMainTextChanges,
  convertMainTextToFmtText,
  fmtTextToEditionWitnessTokens,
  MainTextEditChange,
  witnessTokenFromEditor
} from '@/Edition/MainTextEditChanges';
import {deepCopy} from '@/toolbox/Util';
import {AsyncMyersDiff} from '@/toolbox/MyersDiff/AysncMyersDiff';
import EditionMainTextEditorWrapper from '@/ReactAPM/Pages/EditionComposer/MainTextPanel/EditionMainTextEditorWrapper';
import MainTextEditChangesInfo from '@/ReactAPM/Pages/EditionComposer/MainTextPanel/MainTextEditChangesInfo';

interface MainTextTextEditorProps {
  mainText: MainTextToken[];
  ctData: CtDataInterface;
  editionWitnessTokenNormalizer: (token: WitnessToken) => WitnessToken;
  onCommit: (changes: MainTextEditChange[], baseTokens: WitnessTokenInterface[]) => Promise<boolean>;
}

export default function MainTextTextEditor({mainText, ctData, editionWitnessTokenNormalizer, onCommit}: MainTextTextEditorProps) {
  const [baseTokens] = useState(() => deepCopy(ctData.witnesses[ctData.editionWitnessIndex]?.tokens ?? []));
  const [initialFmtText] = useState(() => convertMainTextToFmtText(mainText));
  const [editorKey, setEditorKey] = useState(0);
  const [detectNumberingLabels, setDetectNumberingLabels] = useState(false);
  const [detectIntraWordQuotationMarks, setDetectIntraWordQuotationMarks] = useState(ctData.lang === 'he');
  const [changes, setChanges] = useState<MainTextEditChange[] | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [progress, setProgress] = useState({iterations: 0, maxIterations: 0});
  const [isCommitting, setIsCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const detectNumberingLabelsRef = useRef(detectNumberingLabels);
  const detectIntraWordQuotationMarksRef = useRef(detectIntraWordQuotationMarks);
  const diffEngineRef = useRef<AsyncMyersDiff | null>(null);
  if (diffEngineRef.current === null) {
    diffEngineRef.current = new AsyncMyersDiff();
  }
  const diffEngine = diffEngineRef.current;
  const requestIdRef = useRef(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestFmtTextRef = useRef(initialFmtText);

  const calculateChanges = useCallback(async (requestId: number, fmtText: FmtText) => {
    try {
      if (requestId !== requestIdRef.current) {
        return;
      }
      const newTokens = fmtTextToEditionWitnessTokens(
        fmtText,
        ctData.lang,
        detectNumberingLabelsRef.current,
        detectIntraWordQuotationMarksRef.current,
        editionWitnessTokenNormalizer
      ).map(witnessTokenFromEditor);
      const newChanges = await calculateMainTextChanges(diffEngine, baseTokens, newTokens);
      if (requestId !== requestIdRef.current) {
        return;
      }
      setChanges(newChanges ?? []);
      setError(null);
    } catch (caughtError) {
      if (requestId === requestIdRef.current) {
        setChanges([]);
        setError(caughtError instanceof Error ? caughtError.message : String(caughtError));
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setIsCalculating(false);
        setShowProgress(false);
      }
    }
  }, [baseTokens, ctData.lang, diffEngine, editionWitnessTokenNormalizer]);

  const scheduleCalculation = useCallback((fmtText: FmtText) => {
    latestFmtTextRef.current = fmtText;
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
    }
    const requestId = ++requestIdRef.current;
    diffEngine.abort();
    setChanges(null);
    setError(null);
    setIsCalculating(true);
    setProgress({iterations: 0, maxIterations: 0});
    debounceTimerRef.current = setTimeout(() => {
      void calculateChanges(requestId, latestFmtTextRef.current);
    }, 500);
  }, [calculateChanges, diffEngine]);

  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isCalculating) {
      setShowProgress(false);
      return;
    }
    const progressDelay = setTimeout(() => {
      if (!diffEngine.isRunning()) {
        return;
      }
      setShowProgress(true);
      const interval = setInterval(() => {
        if (!diffEngine.isRunning()) {
          return;
        }
        setProgress({iterations: diffEngine.getIterations(), maxIterations: diffEngine.getMaxIterations()});
      }, 250);
      progressIntervalRef.current = interval;
    }, 1000);
    return () => {
      clearTimeout(progressDelay);
      if (progressIntervalRef.current !== null) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, [diffEngine, isCalculating]);

  useEffect(() => () => {
    requestIdRef.current++;
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
    }
    if (progressIntervalRef.current !== null) {
      clearInterval(progressIntervalRef.current);
    }
    diffEngine.abort();
  }, [diffEngine]);

  const revert = () => {
    requestIdRef.current++;
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    diffEngine.abort();
    latestFmtTextRef.current = initialFmtText;
    setChanges(null);
    setError(null);
    setIsCalculating(false);
    setShowProgress(false);
    setEditorKey(key => key + 1);
  };

  const commit = async () => {
    if (changes === null || changes.length === 0 || isCalculating || isCommitting) {
      return;
    }
    setIsCommitting(true);
    setError(null);
    try {
      await onCommit(changes, baseTokens);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : String(caughtError));
    } finally {
      setIsCommitting(false);
    }
  };

  return <div className={`main-text-text-editor text-${ctData.lang}`}>
    <div className="main-text-text-editor-controls">
      <Form.Check type="switch" id="main-text-auto-numbering-labels" label="Auto NL"
                  checked={detectNumberingLabels} onChange={(event) => {
                    detectNumberingLabelsRef.current = event.currentTarget.checked;
                    setDetectNumberingLabels(event.currentTarget.checked);
                    scheduleCalculation(latestFmtTextRef.current);
                  }}/>
      {ctData.lang === 'he' && <Form.Check type="switch" id="main-text-smart-quotation-marks" label="Smart QM"
                                           checked={detectIntraWordQuotationMarks} onChange={(event) => {
                                             detectIntraWordQuotationMarksRef.current = event.currentTarget.checked;
                                             setDetectIntraWordQuotationMarks(event.currentTarget.checked);
                                             scheduleCalculation(latestFmtTextRef.current);
                                           }}/>}
    </div>
    <EditionMainTextEditorWrapper key={editorKey} initialText={initialFmtText} lang={ctData.lang}
                                  onChange={scheduleCalculation}/>
    <div className="main-text-text-editor-status" aria-live="polite">
      {isCalculating && <span>Calculating changes... <Spinner animation="border" size="sm" role="status"/>
        {showProgress && ` ${progress.iterations} calculations of max. ${progress.maxIterations}`}</span>}
      {error !== null && <span className="text-danger">{error}</span>}
      {changes !== null && changes.length > 0 && <MainTextEditChangesInfo changes={changes}/>}
      {!isCalculating && (changes === null || changes.length === 0) && error === null && <span>No changes</span>}
    </div>
    <div className="main-text-text-editor-actions">
      <Button variant="outline-secondary" onClick={revert}>Revert</Button>
      <Button variant="primary" disabled={changes === null || changes.length === 0 || isCalculating || isCommitting}
              onClick={() => void commit()}>
        {isCommitting ? 'Committing...' : 'Commit'}
      </Button>
    </div>
  </div>;
}