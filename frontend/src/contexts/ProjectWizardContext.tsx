import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export type WizardStep = 'setup' | 'upload' | 'review' | 'vendors' | 'rfqs' | 'award';

export const WIZARD_STEPS: { id: WizardStep; label: string; number: number }[] = [
  { id: 'setup', label: 'Project Setup', number: 1 },
  { id: 'upload', label: 'Upload Plans', number: 2 },
  { id: 'review', label: 'Review BOM', number: 3 },
  { id: 'vendors', label: 'Match Vendors', number: 4 },
  { id: 'rfqs', label: 'Review RFQs', number: 5 },
  { id: 'award', label: 'Award Vendors', number: 6 },
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
  selectedVendorIds: string[];
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
  setSelectedVendorIds: (ids: string[]) => void;
  resetWizard: () => void;
  canProceed: boolean;
  saving: boolean;
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
    if (saved) {
      const parsed = JSON.parse(saved);
      return { selectedVendorIds: [], ...parsed };
    }
  } catch { /* ignore */ }
  return {
    currentStep: 'setup',
    projectId: null,
    takeoffJobId: null,
    takeoffFileId: null,
    takeoffData: null,
    setupData: defaultSetupData,
    selectedVendorIds: [],
  };
}

const WizardContext = createContext<WizardContextType | undefined>(undefined);

export function ProjectWizardProvider({ children }: { children: ReactNode }) {
  const [searchParams] = useSearchParams();
  const resumeId = searchParams.get('resume');

  const [state, setState] = useState<WizardState>(() => {
    if (resumeId) {
      return loadState();
    }
    localStorage.removeItem(STORAGE_KEY);
    return {
      currentStep: 'setup',
      projectId: null,
      takeoffJobId: null,
      takeoffFileId: null,
      takeoffData: null,
      setupData: defaultSetupData,
      selectedVendorIds: [],
    };
  });
  const [saving, setSaving] = useState(false);
  const resumeLoaded = useRef(false);

  useEffect(() => {
    if (resumeLoaded.current || !resumeId) return;

    resumeLoaded.current = true;
    const resumeStep = searchParams.get('step') as WizardStep | null;
    axios.get(`${API_URL}/projects/${resumeId}`).then((res) => {
      const project = res.data.project || res.data;
      setState({
        currentStep: resumeStep || (project.wizardStep as WizardStep) || 'setup',
        projectId: project.id,
        takeoffJobId: project.takeoffJobId || null,
        takeoffFileId: null,
        takeoffData: null,
        setupData: {
          name: project.name || '',
          clientName: project.clientName || '',
          location: project.location || '',
          notes: project.notes || '',
          dueDate: project.dueDate ? project.dueDate.split('T')[0] : '',
          disciplines: ['A', 'P', 'M', 'E'],
          targets: ['rooms', 'walls', 'doors', 'windows', 'pipes', 'ducts', 'fixtures'],
        },
        selectedVendorIds: project.selectedVendorIds || [],
      });
    }).catch((err) => {
      console.error('Failed to load project for resume:', err);
    });
  }, [resumeId, searchParams]);

  useEffect(() => {
    const { takeoffData, ...saveable } = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saveable));
  }, [state]);

  const stepIndex = WIZARD_STEPS.findIndex((s) => s.id === state.currentStep);

  const setStep = (step: WizardStep) =>
    setState((prev) => ({ ...prev, currentStep: step }));

  const saveProjectToServer = async (nextStepId: WizardStep) => {
    setSaving(true);
    try {
      if (!state.projectId) {
        const res = await axios.post(`${API_URL}/projects`, {
          name: state.setupData.name,
          location: state.setupData.location || undefined,
          clientName: state.setupData.clientName || undefined,
          dueDate: state.setupData.dueDate || undefined,
          notes: state.setupData.notes || undefined,
          wizardStep: nextStepId,
        });
        setState((prev) => ({ ...prev, projectId: res.data.id, currentStep: nextStepId }));
      } else {
        await axios.put(`${API_URL}/projects/${state.projectId}`, {
          name: state.setupData.name,
          location: state.setupData.location || undefined,
          clientName: state.setupData.clientName || undefined,
          dueDate: state.setupData.dueDate || undefined,
          notes: state.setupData.notes || undefined,
          wizardStep: nextStepId,
        });
        setState((prev) => ({ ...prev, currentStep: nextStepId }));
      }
    } catch (err) {
      console.error('Failed to save project:', err);
      setState((prev) => ({ ...prev, currentStep: nextStepId }));
    } finally {
      setSaving(false);
    }
  };

  const updateWizardStep = async (stepId: WizardStep) => {
    if (state.projectId) {
      try {
        await axios.put(`${API_URL}/projects/${state.projectId}`, { wizardStep: stepId });
      } catch { /* non-critical */ }
    }
  };

  const nextStep = async () => {
    if (stepIndex >= WIZARD_STEPS.length - 1) return;
    const nextStepId = WIZARD_STEPS[stepIndex + 1].id;

    if (state.currentStep === 'setup') {
      await saveProjectToServer(nextStepId);
    } else {
      updateWizardStep(nextStepId);
      setState((prev) => ({ ...prev, currentStep: nextStepId }));
    }
  };

  const prevStep = () => {
    if (stepIndex > 0) {
      const prevStepId = WIZARD_STEPS[stepIndex - 1].id;
      updateWizardStep(prevStepId);
      setState((prev) => ({ ...prev, currentStep: prevStepId }));
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

  const setSelectedVendorIds = (ids: string[]) =>
    setState((prev) => ({ ...prev, selectedVendorIds: ids }));

  const resetWizard = () => {
    localStorage.removeItem(STORAGE_KEY);
    setState({
      currentStep: 'setup',
      projectId: null,
      takeoffJobId: null,
      takeoffFileId: null,
      takeoffData: null,
      setupData: defaultSetupData,
      selectedVendorIds: [],
    });
  };

  const canProceed = (() => {
    if (saving) return false;
    switch (state.currentStep) {
      case 'setup':
        return state.setupData.name.trim().length > 0;
      case 'upload':
        return !!state.takeoffData;
      case 'review':
        return !!state.projectId;
      case 'vendors':
        return !!state.projectId;
      case 'rfqs':
        return !!state.projectId;
      case 'award':
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
        setSelectedVendorIds,
        resetWizard,
        canProceed,
        saving,
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
