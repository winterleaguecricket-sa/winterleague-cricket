// Sales Funnels data
let funnels = [
  {
    id: 1,
    name: 'Premium Equipment Purchase Flow',
    description: 'Guide customers through premium equipment selection',
    active: true,
    steps: [
      {
        id: 1,
        order: 1,
        type: 'category', // 'category', 'form', 'page', 'checkout'
        targetId: 1, // Category/Form/Page ID
        title: 'Browse Premium Equipment',
        description: 'View our premium products'
      },
      {
        id: 2,
        order: 2,
        type: 'form',
        targetId: 1,
        title: 'Equipment Registration',
        description: 'Tell us about your needs'
      },
      {
        id: 3,
        order: 3,
        type: 'checkout',
        targetId: null,
        title: 'Complete Purchase',
        description: 'Finalize your order'
      }
    ],
    createdAt: new Date().toISOString()
  }
];

let funnelIdCounter = 2;
let stepIdCounter = 100;

// Funnel CRUD operations
export function getFunnels() {
  return funnels;
}

export function getFunnelById(id) {
  return funnels.find(funnel => funnel.id === id);
}

export function getActiveFunnels() {
  return funnels.filter(funnel => funnel.active);
}

export function addFunnel(funnel) {
  const newFunnel = {
    ...funnel,
    id: funnelIdCounter++,
    steps: funnel.steps || [],
    active: true,
    createdAt: new Date().toISOString()
  };
  funnels.push(newFunnel);
  return newFunnel;
}

export function updateFunnel(id, updates) {
  const index = funnels.findIndex(f => f.id === id);
  if (index !== -1) {
    funnels[index] = { ...funnels[index], ...updates };
    return funnels[index];
  }
  return null;
}

export function deleteFunnel(id) {
  const index = funnels.findIndex(f => f.id === id);
  if (index !== -1) {
    funnels.splice(index, 1);
    return true;
  }
  return false;
}

// Funnel Steps Management
export function addStepToFunnel(funnelId, step) {
  const funnel = funnels.find(f => f.id === funnelId);
  if (funnel) {
    const newStep = {
      ...step,
      id: stepIdCounter++,
      order: funnel.steps.length + 1
    };
    funnel.steps.push(newStep);
    return newStep;
  }
  return null;
}

export function updateFunnelStep(funnelId, stepId, updates) {
  const funnel = funnels.find(f => f.id === funnelId);
  if (funnel) {
    const stepIndex = funnel.steps.findIndex(step => step.id === stepId);
    if (stepIndex !== -1) {
      funnel.steps[stepIndex] = { ...funnel.steps[stepIndex], ...updates };
      return funnel.steps[stepIndex];
    }
  }
  return null;
}

export function deleteFunnelStep(funnelId, stepId) {
  const funnel = funnels.find(f => f.id === funnelId);
  if (funnel) {
    const stepIndex = funnel.steps.findIndex(step => step.id === stepId);
    if (stepIndex !== -1) {
      funnel.steps.splice(stepIndex, 1);
      // Reorder remaining steps
      funnel.steps.forEach((step, index) => {
        step.order = index + 1;
      });
      return true;
    }
  }
  return false;
}

export function reorderFunnelSteps(funnelId, stepIds) {
  const funnel = funnels.find(f => f.id === funnelId);
  if (funnel) {
    const reorderedSteps = stepIds.map((id, index) => {
      const step = funnel.steps.find(s => s.id === id);
      return { ...step, order: index + 1 };
    });
    funnel.steps = reorderedSteps;
    return true;
  }
  return false;
}

// Get next step in funnel
export function getNextStep(funnelId, currentStepId) {
  const funnel = funnels.find(f => f.id === funnelId);
  if (funnel) {
    const currentStep = funnel.steps.find(s => s.id === currentStepId);
    if (currentStep) {
      const nextStep = funnel.steps.find(s => s.order === currentStep.order + 1);
      return nextStep || null;
    }
  }
  return null;
}

// Get previous step in funnel
export function getPreviousStep(funnelId, currentStepId) {
  const funnel = funnels.find(f => f.id === funnelId);
  if (funnel) {
    const currentStep = funnel.steps.find(s => s.id === currentStepId);
    if (currentStep && currentStep.order > 1) {
      const prevStep = funnel.steps.find(s => s.order === currentStep.order - 1);
      return prevStep || null;
    }
  }
  return null;
}

// Get funnel progress
export function getFunnelProgress(funnelId, currentStepId) {
  const funnel = funnels.find(f => f.id === funnelId);
  if (funnel) {
    const currentStep = funnel.steps.find(s => s.id === currentStepId);
    if (currentStep) {
      const progress = (currentStep.order / funnel.steps.length) * 100;
      return {
        current: currentStep.order,
        total: funnel.steps.length,
        percentage: Math.round(progress)
      };
    }
  }
  return { current: 0, total: 0, percentage: 0 };
}

// Get funnel URL for button linking
export function getFunnelUrl(funnelId) {
  return `/funnel/${funnelId}?step=1`;
}
