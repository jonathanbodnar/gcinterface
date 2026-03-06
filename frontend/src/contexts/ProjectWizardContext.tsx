import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export type WizardStep = 'setup' | 'upload' | 'review' | 'vendors' | 'rfqs' | 'dashboard';

export const WIZARD_STEPS: { id: WizardStep; label: string; number: number }[] = [
  { id: 'setup', label: 'Project Setup', number: 1 },
  { id: 'upload', label: 'Upload Plans', number: 2 },
  { id: 'review', label: 'Review BOM', number: 3 },
  { id: 'vendors', label: 'Match Vendors', number: 4 },
  { id: 'rfqs', label: 'Send RFQs', number: 5 },
  { id: 'dashboard', label: 'Dashboard', number: 6 },
];

interface ProjectSetupData {
  name: string;
  clientName: string;
  location: string;
  notes: string;
  dueDate: string;
  disciplines: string[];
  targets: string[];
}

interface WizardState {
  currentStep: WizardStep;
  projectId: string | null;
  takeoffJobId: string | null;
  takeoffFileId: string | null;
  takeoffData: any | null;
  setupData: ProjectSetupData;
}

interface WizardContextType extends WizardState {
  setStep: (step: WizardStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  setProjectId: (id: string) => void;
  setTakeoffJobId: (id: string) => void;
  setTakeoffFileId: (id: string) => void;
  setTakeoffData: (data: any) => void;
  setSetupData: (data: Partial<ProjectSetupData>) => void;
  resetWizard: () => void;
  canProceed: boolean;
}

const defaultSetupData: ProjectSetupData = {
  name: '',
  clientName: '',
  location: '',
  notes: '',
  dueDate: '',
  disciplines: ['A', 'P', 'M', 'E'],
  targets: ['rooms', 'walls', 'doors', 'windows', 'pipes', 'ducts', 'fixtures'],
};

const STORAGE_KEY = 'gc-wizard-state';

function loadState(): WizardState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return {
    currentStep: 'setup',
    projectId: null,
    takeoffJobId: null,
    takeoffFileId: null,
    takeoffData: null,
    setupData: defaultSetupData,
  };
}

const WizardContext = createContext<WizardContextType | undefined>(undefined);

export function ProjectWizardProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WizardState>(loadState);

  useEffect(() => {
    const { takeoffData, ...saveable } = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saveable));
  }, [state]);

  const stepIndex = WIZARD_STEPS.findIndex((s) => s.id === state.currentStep);

  const setStep = (step: WizardStep) =>
    setState((prev) => ({ ...prev, currentStep: step }));

  const nextStep = () => {
    if (stepIndex < WIZARD_STEPS.length - 1) {
      setState((prev) => ({
        ...prev,
        currentStep: WIZARD_STEPS[stepIndex + 1].id,
      }));
    }
  };

  const prevStep = () => {
    if (stepIndex > 0) {
      setState((prev) => ({
        ...prev,
        currentStep: WIZARD_STEPS[stepIndex - 1].id,
      }));
    }
  };

  const setProjectId = (id: string) =>
    setState((prev) => ({ ...prev, projectId: id }));

  const setTakeoffJobId = (id: string) =>
    setState((prev) => ({ ...prev, takeoffJobId: id }));

  const setTakeoffFileId = (id: string) =>
    setState((prev) => ({ ...prev, takeoffFileId: id }));

  const setTakeoffData = (data: any) =>
    setState((prev) => ({ ...prev, takeoffData: data }));

  const setSetupData = (data: Partial<ProjectSetupData>) =>
    setState((prev) => ({
      ...prev,
      setupData: { ...prev.setupData, ...data },
    }));

  const resetWizard = () => {
    localStorage.removeItem(STORAGE_KEY);
    setState({
      currentStep: 'setup',
      projectId: null,
      takeoffJobId: null,
      takeoffFileId: null,
      takeoffData: null,
      setupData: defaultSetupData,
    });
  };

  const canProceed = (() => {
    switch (state.currentStep) {
      case 'setup':
        return state.setupData.name.trim().length > 0;
      case 'upload':
        return !!state.takeoffJobId;
      case 'review':
        return !!state.projectId;
      case 'vendors':
        return !!state.projectId;
      case 'rfqs':
        return !!state.projectId;
      case 'dashboard':
        return true;
      default:
        return false;
    }
  })();

  return (
    <WizardContext.Provider
      value={{
        ...state,
        setStep,
        nextStep,
        prevStep,
        setProjectId,
        setTakeoffJobId,
        setTakeoffFileId,
        setTakeoffData,
        setSetupData,
        resetWizard,
        canProceed,
      }}
    >
      {children}
    </WizardContext.Provider>
  );
}

export function useWizard() {
  const context = useContext(WizardContext);
  if (!context) {
    throw new Error('useWizard must be used within a ProjectWizardProvider');
  }
  return context;
}
