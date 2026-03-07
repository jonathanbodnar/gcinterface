import { useNavigate } from 'react-router-dom';
import { useWizard, WIZARD_STEPS } from '../../contexts/ProjectWizardContext';
import { Button } from '@/components/ui/button';
import { Check, ChevronLeft, ChevronRight, RotateCcw, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WizardLayoutProps {
  children: React.ReactNode;
}

export default function WizardLayout({ children }: WizardLayoutProps) {
  const navigate = useNavigate();
  const { currentStep, nextStep, prevStep, canProceed, resetWizard, setStep, saving } = useWizard();
  const currentIndex = WIZARD_STEPS.findIndex((s) => s.id === currentStep);
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === WIZARD_STEPS.length - 1;

  return (
    <div className="min-h-screen bg-background">
      {/* Step Indicator */}
      <div className="border-b bg-card sticky top-0 z-40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold tracking-tight">New Project</h1>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={resetWizard}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Start Over
              </Button>
              <Button variant="ghost" size="sm" onClick={() => {
                navigate('/projects');
              }}>
                <X className="w-4 h-4 mr-2" />
                Exit
              </Button>
            </div>
          </div>

          <nav aria-label="Progress">
            <ol className="flex items-center">
              {WIZARD_STEPS.map((step, index) => {
                const isCompleted = index < currentIndex;
                const isCurrent = step.id === currentStep;

                return (
                  <li
                    key={step.id}
                    className={cn('flex items-center', index < WIZARD_STEPS.length - 1 && 'flex-1')}
                  >
                    <button
                      onClick={() => isCompleted && setStep(step.id)}
                      className={cn(
                        'flex items-center gap-2 text-sm font-medium',
                        isCurrent && 'text-primary',
                        isCompleted && 'text-green-600 cursor-pointer hover:underline',
                        !isCurrent && !isCompleted && 'text-muted-foreground cursor-default'
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold',
                          isCurrent && 'border-primary bg-primary text-primary-foreground',
                          isCompleted && 'border-green-600 bg-green-600 text-white',
                          !isCurrent && !isCompleted && 'border-muted-foreground/30'
                        )}
                      >
                        {isCompleted ? <Check className="h-4 w-4" /> : step.number}
                      </span>
                      <span className="hidden sm:inline">{step.label}</span>
                    </button>

                    {index < WIZARD_STEPS.length - 1 && (
                      <div
                        className={cn(
                          'mx-2 h-0.5 flex-1',
                          isCompleted ? 'bg-green-600' : 'bg-muted-foreground/20'
                        )}
                      />
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </div>

      {/* Navigation Footer */}
      <div className="sticky bottom-0 border-t bg-card py-4">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex justify-between">
          <Button variant="outline" onClick={prevStep} disabled={isFirst}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>
          {!isLast && (
            <Button onClick={nextStep} disabled={!canProceed || saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {saving ? 'Saving...' : 'Next Step'}
              {!saving && <ChevronRight className="w-4 h-4 ml-2" />}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
