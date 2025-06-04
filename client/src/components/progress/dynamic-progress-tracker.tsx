import { CheckCircle, Clock, User, FileText, TestTube, CreditCard, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface ProgressStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  status: "completed" | "current" | "upcoming";
}

interface DynamicProgressTrackerProps {
  currentStep: string;
  patientData?: any;
  className?: string;
}

export default function DynamicProgressTracker({ 
  currentStep, 
  patientData,
  className 
}: DynamicProgressTrackerProps) {
  const steps: ProgressStep[] = [
    {
      id: "registration",
      title: "Patient Registration",
      description: "Basic information and contact details",
      icon: <User className="w-5 h-5" />,
      status: getStepStatus("registration", currentStep)
    },
    {
      id: "pathway",
      title: "Referral Pathway",
      description: "Self-pay or provider referral selection",
      icon: <FileText className="w-5 h-5" />,
      status: getStepStatus("pathway", currentStep)
    },
    {
      id: "tests",
      title: "Test Selection",
      description: "Choose diagnostic procedures",
      icon: <TestTube className="w-5 h-5" />,
      status: getStepStatus("tests", currentStep)
    },
    {
      id: "scheduling",
      title: "Appointment Scheduling",
      description: "Book your preferred time slot",
      icon: <Clock className="w-5 h-5" />,
      status: getStepStatus("scheduling", currentStep)
    },
    {
      id: "payment",
      title: "Payment Processing",
      description: "Complete financial arrangements",
      icon: <CreditCard className="w-5 h-5" />,
      status: getStepStatus("payment", currentStep)
    },
    {
      id: "confirmation",
      title: "Confirmation",
      description: "Receive appointment details",
      icon: <Bell className="w-5 h-5" />,
      status: getStepStatus("confirmation", currentStep)
    }
  ];

  function getStepStatus(stepId: string, current: string): "completed" | "current" | "upcoming" {
    const stepOrder = ["registration", "pathway", "tests", "scheduling", "payment", "confirmation"];
    const currentIndex = stepOrder.indexOf(current);
    const stepIndex = stepOrder.indexOf(stepId);
    
    if (stepIndex < currentIndex) return "completed";
    if (stepIndex === currentIndex) return "current";
    return "upcoming";
  }

  const completedSteps = steps.filter(step => step.status === "completed").length;
  const totalSteps = steps.length;
  const progressPercentage = (completedSteps / totalSteps) * 100;

  return (
    <div className={cn("bg-white rounded-lg border p-6", className)}>
      {/* Header with animated progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900">Patient Journey</h3>
          <span className="text-sm text-gray-500">
            {completedSteps} of {totalSteps} completed
          </span>
        </div>
        
        {/* Animated progress bar */}
        <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
          
          {/* Sparkle effect for completed progress */}
          {progressPercentage > 0 && (
            <motion.div
              className="absolute top-0 right-0 h-full w-8 bg-gradient-to-l from-yellow-400 to-transparent"
              style={{ right: `${100 - progressPercentage}%` }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
        </div>
      </div>

      {/* Step list */}
      <div className="space-y-4">
        {steps.map((step, index) => (
          <motion.div
            key={step.id}
            className={cn(
              "flex items-start space-x-4 p-3 rounded-lg transition-all duration-300",
              step.status === "current" && "bg-blue-50 border border-blue-200",
              step.status === "completed" && "bg-green-50",
              step.status === "upcoming" && "bg-gray-50"
            )}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            {/* Step icon with animation */}
            <div className="flex-shrink-0 relative">
              <motion.div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  step.status === "completed" && "bg-green-500 text-white",
                  step.status === "current" && "bg-blue-500 text-white",
                  step.status === "upcoming" && "bg-gray-300 text-gray-500"
                )}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {step.status === "completed" ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                  >
                    <CheckCircle className="w-5 h-5" />
                  </motion.div>
                ) : (
                  step.icon
                )}
              </motion.div>
              
              {/* Pulsing animation for current step */}
              {step.status === "current" && (
                <motion.div
                  className="absolute inset-0 w-10 h-10 rounded-full bg-blue-500 opacity-20"
                  animate={{ scale: [1, 1.5, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
            </div>

            {/* Step content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <h4 className={cn(
                  "text-sm font-medium",
                  step.status === "completed" && "text-green-700",
                  step.status === "current" && "text-blue-700",
                  step.status === "upcoming" && "text-gray-500"
                )}>
                  {step.title}
                </h4>
                
                {/* Celebration confetti for completed steps */}
                {step.status === "completed" && (
                  <motion.div
                    className="text-yellow-500"
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 1, repeat: 3 }}
                  >
                    ✨
                  </motion.div>
                )}
                
                {/* Loading spinner for current step */}
                {step.status === "current" && (
                  <motion.div
                    className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                )}
              </div>
              
              <p className={cn(
                "text-xs",
                step.status === "completed" && "text-green-600",
                step.status === "current" && "text-blue-600",
                step.status === "upcoming" && "text-gray-400"
              )}>
                {step.description}
              </p>
              
              {/* Show patient data for completed steps */}
              {step.status === "completed" && step.id === "registration" && patientData && (
                <motion.div
                  className="mt-2 p-2 bg-white rounded border text-xs text-gray-600"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  transition={{ delay: 0.3 }}
                >
                  <span className="font-medium">{patientData.firstName} {patientData.lastName}</span>
                  {patientData.phone && <span className="ml-2">• {patientData.phone}</span>}
                </motion.div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Motivational message */}
      <motion.div
        className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-100"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <div className="text-center">
          {progressPercentage === 0 && (
            <div>
              <span className="text-2xl">🚀</span>
              <p className="text-sm text-blue-700 font-medium mt-1">
                Let's get started with your healthcare journey!
              </p>
            </div>
          )}
          
          {progressPercentage > 0 && progressPercentage < 100 && (
            <div>
              <span className="text-2xl">💪</span>
              <p className="text-sm text-blue-700 font-medium mt-1">
                Great progress! You're {Math.round(progressPercentage)}% complete.
              </p>
            </div>
          )}
          
          {progressPercentage === 100 && (
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 1, repeat: 2 }}
            >
              <span className="text-2xl">🎉</span>
              <p className="text-sm text-green-700 font-medium mt-1">
                Congratulations! Your appointment is confirmed.
              </p>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}