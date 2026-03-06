import { ProjectWizardProvider, useWizard } from '../contexts/ProjectWizardContext';
import WizardLayout from '../components/wizard/WizardLayout';
import StepProjectSetup from '../components/wizard/StepProjectSetup';
import StepUploadPlans from '../components/wizard/StepUploadPlans';
import StepReviewBOM from '../components/wizard/StepReviewBOM';
import StepMatchVendors from '../components/wizard/StepMatchVendors';
import StepSendRFQs from '../components/wizard/StepSendRFQs';
import StepDashboard from '../components/wizard/StepDashboard';

function WizardContent() {
  const { currentStep } = useWizard();

  const stepComponent = {
    setup: <StepProjectSetup />,
    upload: <StepUploadPlans />,
    review: <StepReviewBOM />,
    vendors: <StepMatchVendors />,
    rfqs: <StepSendRFQs />,
    dashboard: <StepDashboard />,
  }[currentStep];

  return <WizardLayout>{stepComponent}</WizardLayout>;
}

export default function ProjectWizard() {
  return (
    <ProjectWizardProvider>
      <WizardContent />
    </ProjectWizardProvider>
  );
}
