// Google Analytics 4 event tracking utility
// Use these functions to track form interactions, checkouts, and registrations

/**
 * Send a custom event to Google Analytics 4
 */
export function trackEvent(eventName, params = {}) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, params);
  }
}

// ============================================================
// Form Tracking Events
// ============================================================

/**
 * Track when a user starts filling out a form (first interaction)
 */
export function trackFormStart(formId, formName) {
  trackEvent('form_start', {
    form_id: formId,
    form_name: formName || getFormName(formId),
    event_category: 'forms',
  });
}

/**
 * Track step navigation in multi-page forms
 */
export function trackFormStep(formId, stepNumber, stepName) {
  trackEvent('form_step', {
    form_id: formId,
    form_name: getFormName(formId),
    step_number: stepNumber,
    step_name: stepName || `Step ${stepNumber}`,
    event_category: 'forms',
  });
}

/**
 * Track successful form submission
 */
export function trackFormSubmit(formId, formName, extras = {}) {
  trackEvent('form_submit', {
    form_id: formId,
    form_name: formName || getFormName(formId),
    event_category: 'forms',
    ...extras,
  });
}

/**
 * Track form validation errors (user tried to submit but had missing fields)
 */
export function trackFormError(formId, missingFieldCount) {
  trackEvent('form_error', {
    form_id: formId,
    form_name: getFormName(formId),
    missing_fields: missingFieldCount,
    event_category: 'forms',
  });
}

/**
 * Track form abandonment (user navigates away before submitting)
 */
export function trackFormAbandon(formId, lastStep) {
  trackEvent('form_abandon', {
    form_id: formId,
    form_name: getFormName(formId),
    last_step: lastStep,
    event_category: 'forms',
  });
}

// ============================================================
// Registration Tracking Events
// ============================================================

/**
 * Track team registration completion
 */
export function trackTeamRegistration(teamName) {
  trackEvent('team_registration', {
    team_name: teamName,
    event_category: 'registrations',
  });
}

/**
 * Track player registration submission (before payment)
 */
export function trackPlayerRegistration(playerCount) {
  trackEvent('player_registration', {
    player_count: playerCount || 1,
    event_category: 'registrations',
  });
}

// ============================================================
// Checkout & Payment Tracking Events
// ============================================================

/**
 * Track checkout page view
 */
export function trackCheckoutView(cartTotal, itemCount) {
  trackEvent('begin_checkout', {
    value: cartTotal,
    currency: 'ZAR',
    items_count: itemCount,
    event_category: 'ecommerce',
  });
}

/**
 * Track payment initiation (redirect to PayFast)
 */
export function trackPaymentStart(orderId, amount, gateway) {
  trackEvent('payment_start', {
    order_id: orderId,
    value: amount,
    currency: 'ZAR',
    payment_method: gateway || 'payfast',
    event_category: 'ecommerce',
  });
}

/**
 * Track payment success
 */
export function trackPaymentSuccess(orderId, amount) {
  trackEvent('purchase', {
    transaction_id: orderId,
    value: amount,
    currency: 'ZAR',
    event_category: 'ecommerce',
  });
}

// ============================================================
// Page View Tracking
// ============================================================

/**
 * Track custom page view (for dynamic pages like forms)
 */
export function trackPageView(pagePath, pageTitle) {
  trackEvent('page_view', {
    page_path: pagePath,
    page_title: pageTitle,
  });
}

// ============================================================
// Helpers
// ============================================================

function getFormName(formId) {
  switch (Number(formId)) {
    case 1: return 'Team Registration';
    case 2: return 'Player Registration';
    default: return `Form ${formId}`;
  }
}
