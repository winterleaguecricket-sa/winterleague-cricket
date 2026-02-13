// Form templates data
// 
// REVENUE AGGREGATION MODEL:
// ------------------------
// Team Registration (Form ID 1):
//   - Field 1: Main team name (e.g., "Lions Rugby Club")
//   - Field 33: Sub-teams/age groups (e.g., "Lions U13", "Lions Senior")
//   - Sub-teams are organizational only - all revenue aggregates to the main team
//
// Player Registration (Form ID 2):
//   - Field 8: Team selection (links to team registration submission)
//   - Field 34: Sub-team selection (appears only if team has multiple sub-teams)
//   - Revenue tracking uses field 8 (main team), field 34 is for player assignment only
//
// Revenue Sources:
//   - Player registration markup → credited to main team (field 8)
//   - Product sales commission (10%) → credited to main team (field 8)
//   - All revenue is aggregated under the main team name regardless of sub-team
//
import { getBasicKit } from './registrationProducts';
import { getSupporterProducts } from './supporterProducts';

let formTemplates = [
  {
    id: 1,
    name: 'Team Registration',
    description: 'Register your team for the Winter League',
    categoryIds: [],
    displayLocations: ['forms-page'],
    active: true,
    multiPage: true,
    welcomeBanner: {
      imageUrl: '/images/team-welcome.jpg',
      title: 'Welcome to Team Registration',
      subtitle: 'Register your team and prepare for the season',
      showOnPage: 1
    },
    pages: [
      {
        pageId: 1,
        pageTitle: 'Team Information',
        fields: [
          {
            id: 1,
            type: 'text',
            label: 'Team Name',
            placeholder: 'Enter your team name',
            required: true,
            order: 1
          },
          {
            id: 2,
            type: 'text',
            label: 'Team Manager Name',
            placeholder: 'Enter team manager full name',
            required: true,
            order: 2
          },
          {
            id: 35,
            type: 'tel',
            label: 'Team Manager Contact Number',
            placeholder: '0821234567',
            required: true,
            order: 2.5
          },
          {
            id: 3,
            type: 'email',
            label: 'Team Email',
            placeholder: 'team@example.com',
            required: true,
            order: 3
          },
          {
            id: 32,
            type: 'number',
            label: 'Number of Teams',
            placeholder: '1',
            required: true,
            order: 4,
            min: 1,
            max: 20,
            defaultValue: 1,
            helpText: 'How many age group teams are you registering? (e.g., U13, U15, Senior teams)'
          },
          {
            id: 33,
            type: 'dynamic-team-entries',
            label: 'Age Group Teams',
            required: true,
            order: 5,
            dependsOn: 32,
            helpText: 'Enter a name for each age group team (e.g., "Lions U13", "Lions Senior")'
          },
          {
            id: 5,
            type: 'text',
            label: 'Team Residing Suburb/Area',
            placeholder: 'Enter suburb or area location',
            required: false,
            order: 6
          }
        ]
      },
      {
        pageId: 2,
        pageTitle: 'Team Kit Designs',
        fields: [
          {
            id: 22,
            type: 'file',
            label: 'Team Logo',
            placeholder: 'Upload your team logo',
            required: true,
            order: 1,
            accept: 'image/*',
            helpText: 'Upload your team logo (PNG, JPG, or SVG format)'
          },
          {
            id: 23,
            type: 'image-select-library',
            label: 'Select Team Kit Design',
            required: true,
            order: 2,
            includeColorPickers: true
          },
          {
            id: 30,
            type: 'file',
            label: 'Sponsor Logo (Optional)',
            placeholder: 'Upload sponsor logo',
            required: false,
            order: 3,
            accept: 'image/*',
            helpText: 'All sponsor logos will be placed on the sleeve and/or pant leg of the kit'
          }
        ]
      },
      {
        pageId: 3,
        pageTitle: 'Kit Costing & Entry Fee',
        fields: [
          {
            id: 29,
            type: 'kit-pricing',
            label: 'Basic Kit Configuration',
            required: false,
            order: 1
          },
          {
            id: 31,
            type: 'entry-fee-pricing',
            label: 'League Entry Fee',
            required: false,
            order: 2
          }
        ]
      }
    ],
    fields: []
  },
  {
    id: 2,
    name: 'Player Registration',
    description: 'Register as a player and select your team',
    categoryIds: [],
    displayLocations: ['forms-page'],
    active: true,
    multiPage: true,
    welcomeBanner: {
      imageUrl: null,
      title: 'Welcome to Player Registration',
      subtitle: 'Join your team and get equipped for the season ahead',
      showOnPage: 1
    },
    pages: [
      {
        pageId: 1,
        pageTitle: 'Parent Information',
        fields: [
          {
            id: 37,
            type: 'text',
            label: 'Parent Full Name and Surname',
            placeholder: 'Enter parent full name and surname',
            required: true,
            order: 1
          },
          {
            id: 38,
            type: 'email',
            label: 'Parent Email Address',
            placeholder: 'parent.email@example.com',
            required: true,
            order: 2
          },
          {
            id: 39,
            type: 'password',
            label: 'Create Password',
            placeholder: 'Create a password',
            required: true,
            order: 3,
            helpText: 'This password will be used to access the parent portal.'
          },
          {
            id: 40,
            type: 'tel',
            label: 'Parent Emergency Contact Number (Primary)',
            placeholder: '0821234567',
            required: true,
            order: 4
          },
          {
            id: 41,
            type: 'tel',
            label: 'Parent Emergency Contact Number (Secondary)',
            placeholder: 'Optional',
            required: false,
            order: 5
          }
        ]
      },
      {
        pageId: 2,
        pageTitle: 'Player Information',
        fields: [
          {
            id: 8,
            type: 'submission-dropdown',
            label: 'Select Your Team',
            required: true,
            order: 2,
            sourceFormId: 1,
            displayFieldId: 1,
            prefillFields: [
              { sourceFieldId: 2, sourceFieldLabel: 'Team Manager' },
              { sourceFieldId: 5, sourceFieldLabel: 'Team Residing Suburb/Area' }
            ]
          },
          {
            id: 44,
            type: 'number',
            label: 'Number of Players',
            placeholder: '1',
            required: true,
            order: 3,
            min: 1,
            max: 4,
            defaultValue: 1,
            helpText: 'You can register up to 4 players in one submission.'
          },
          {
            id: 45,
            type: 'player-entries',
            label: 'Player Details',
            required: true,
            order: 4,
            dependsOn: 44,
            helpText: 'Add each player, select their age group team, and upload their documents.'
          }
        ]
      },
      {
        pageId: 3,
        pageTitle: 'Kit & Equipment',
        fields: [
          {
            id: 24,
            type: 'image-select-library',
            label: 'Team Kit Design',
            required: false,
            order: 1,
            autofillFromSubmission: true,
            autofillSourceFormId: 1,
            autofillSourceFieldId: 23,
            autofillLinkedDropdownFieldId: 8
          },
          {
            id: 25,
            type: 'product-bundle',
            label: 'Basic Kit',
            description: 'Includes: Playing Top, Pants, and Cap',
            required: true,
            order: 2,
            basePrice: 150.00,
            sizeOptions: ['Small', 'Medium', 'Large', 'X-Large', '2X-Large'],
            shirtSizeOptions: [
              '7/8 years',
              '9/10 years',
              '11/12 years',
              '13/14 years',
              'Extra Small',
              'Small',
              'Medium',
              'Large',
              'Extra Large',
              '2 XL',
              '3 XL',
              '4 XL',
              '5 XL'
            ],
            pantsSizeOptions: [
              '7/8 years',
              '9/10 years',
              '11/12 years',
              '13/14 years',
              'Extra Small',
              'Small',
              'Medium',
              'Large',
              'Extra Large',
              '2 XL',
              '3 XL',
              '4 XL',
              '5 XL'
            ],
            colorInheritFromTeam: true
          }
        ]
      },
      {
        pageId: 4,
        pageTitle: 'Supporter Apparel',
        fields: [
          {
            id: 27,
            type: 'supporter-apparel',
            label: 'Supporter Merchandise (Optional)',
            order: 1,
            products: []
          }
        ]
      },
      {
        pageId: 5,
        pageTitle: 'Checkout',
        fields: [
          {
            id: 28,
            type: 'checkout-form',
            label: 'Complete Your Order',
            required: true,
            order: 1
          }
        ]
      }
    ],
    fields: []
  },
  {
    id: 3,
    name: 'Equipment Registration',
    description: 'Collect player equipment preferences and sizing',
    categoryIds: [1],
    displayLocations: ['category', 'forms-page'],
    active: true,
    fields: [
      {
        id: 11,
        type: 'text',
        label: 'Full Name',
        placeholder: 'Enter your full name',
        required: true,
        order: 1
      },
      {
        id: 12,
        type: 'email',
        label: 'Email Address',
        placeholder: 'your.email@example.com',
        required: true,
        order: 2
      },
      {
        id: 13,
        type: 'radio',
        label: 'Player Level',
        required: true,
        order: 3,
        options: ['Beginner', 'Intermediate', 'Advanced', 'Professional']
      },
      {
        id: 14,
        type: 'select',
        label: 'Bat Size',
        required: true,
        order: 4,
        options: ['Size 1', 'Size 2', 'Size 3', 'Size 4', 'Size 5', 'Size 6', 'Full Size']
      },
      {
        id: 15,
        type: 'checkbox',
        label: 'Equipment Interests',
        required: false,
        order: 5,
        options: ['Bats', 'Gloves', 'Pads', 'Helmets', 'Shoes', 'Bags']
      }
    ]
  },
  {
    id: 4,
    name: 'Training Session Booking',
    description: 'Book training sessions and specify requirements',
    categoryIds: [2],
    displayLocations: ['category', 'forms-page'],
    active: true,
    fields: [
      {
        id: 16,
        type: 'text',
        label: 'Participant Name',
        placeholder: 'Enter name',
        required: true,
        order: 1
      },
      {
        id: 17,
        type: 'tel',
        label: 'Contact Number',
        placeholder: '+1 (555) 000-0000',
        required: true,
        order: 2
      },
      {
        id: 18,
        type: 'date',
        label: 'Preferred Date',
        required: true,
        order: 3
      },
      {
        id: 19,
        type: 'radio',
        label: 'Session Type',
        required: true,
        order: 4,
        options: ['Individual', 'Group (2-4)', 'Team (5+)']
      },
      {
        id: 20,
        type: 'checkbox',
        label: 'Training Focus Areas',
        required: false,
        order: 5,
        options: ['Batting', 'Bowling', 'Fielding', 'Wicket Keeping', 'Fitness']
      },
      {
        id: 21,
        type: 'textarea',
        label: 'Additional Requirements',
        placeholder: 'Any specific requirements or questions...',
        required: false,
        order: 6
      }
    ]
  }
];

let formTemplateIdCounter = 5;
let fieldIdCounter = 100;

// Legacy formSubmissions array removed - all submissions now use PostgreSQL
// via pages/api/form-submissions.js and pages/api/submissions.js

// Form Templates CRUD
export function getFormTemplates() {
  return formTemplates;
}

export function getFormTemplateById(id) {
  return formTemplates.find(form => form.id === id);
}

export function getFormTemplatesByCategory(categoryId) {
  return formTemplates.filter(form => 
    form.active && form.categoryIds.includes(categoryId)
  );
}

export function addFormTemplate(template) {
  const newTemplate = {
    ...template,
    id: formTemplateIdCounter++,
    fields: template.fields || [],
    displayLocations: template.displayLocations || ['forms-page'],
    active: true
  };
  formTemplates.push(newTemplate);
  return newTemplate;
}

export function updateFormTemplate(id, updates) {
  const index = formTemplates.findIndex(form => form.id === id);
  if (index !== -1) {
    formTemplates[index] = { ...formTemplates[index], ...updates };
    return formTemplates[index];
  }
  return null;
}

export function deleteFormTemplate(id) {
  const index = formTemplates.findIndex(form => form.id === id);
  if (index !== -1) {
    formTemplates.splice(index, 1);
    return true;
  }
  return false;
}

// Form Fields Management
export function addFieldToForm(formId, field) {
  const form = formTemplates.find(f => f.id === formId);
  if (form) {
    const newField = {
      ...field,
      id: fieldIdCounter++,
      order: form.fields.length + 1
    };
    form.fields.push(newField);
    return newField;
  }
  return null;
}

export function updateFormField(formId, fieldId, updates) {
  const form = formTemplates.find(f => f.id === formId);
  if (form) {
    const fieldIndex = form.fields.findIndex(field => field.id === fieldId);
    if (fieldIndex !== -1) {
      form.fields[fieldIndex] = { ...form.fields[fieldIndex], ...updates };
      return form.fields[fieldIndex];
    }
  }
  return null;
}

export function deleteFormField(formId, fieldId) {
  const form = formTemplates.find(f => f.id === formId);
  if (form) {
    const fieldIndex = form.fields.findIndex(field => field.id === fieldId);
    if (fieldIndex !== -1) {
      form.fields.splice(fieldIndex, 1);
      // Reorder remaining fields
      form.fields.forEach((field, index) => {
        field.order = index + 1;
      });
      return true;
    }
  }
  return false;
}

export function reorderFormFields(formId, fieldIds) {
  const form = formTemplates.find(f => f.id === formId);
  if (form) {
    const reorderedFields = fieldIds.map((id, index) => {
      const field = form.fields.find(f => f.id === id);
      return { ...field, order: index + 1 };
    });
    form.fields = reorderedFields;
    return true;
  }
  return false;
}

// Legacy submission functions removed - all submissions now handled via PostgreSQL
// Use pages/api/form-submissions.js and pages/api/submissions.js for submission operations

export function getAllForms() {
  return formTemplates;
}

// Helper function to get form with dynamic registration products
export function getFormWithProducts(formId) {
  const form = formTemplates.find(f => f.id === formId);
  if (!form || formId !== 2) return form; // Only apply to Player Registration form

  const basicKit = getBasicKit();
  const supporterProducts = getSupporterProducts(true);

  // Clone the form and update product fields
  const formWithProducts = JSON.parse(JSON.stringify(form));
  
  if (formWithProducts.pages) {
    formWithProducts.pages = formWithProducts.pages.map(page => {
      if (page.pageId === 3) {
        // Update product fields with current data (Kit & Equipment page)
        page.fields = page.fields.map(field => {
          if (field.type === 'product-bundle' && basicKit) {
            return {
              ...field,
              label: basicKit.name,
              description: basicKit.description,
              basePrice: basicKit.price,
              sizeOptions: basicKit.sizeOptions,
              colorInheritFromTeam: basicKit.colorInheritFromTeam
            };
          }
          return field;
        });
      }
      if (page.pageId === 4) {
        // Update supporter apparel products (Supporter Apparel page)
        page.fields = page.fields.map(field => {
          if (field.type === 'supporter-apparel') {
            return {
              ...field,
              products: supporterProducts
            };
          }
          return field;
        });
      }
      return page;
    });
  }

  return formWithProducts;
}

// Team kit pricing storage
let teamKitPricing = {}; // Structure: { teamSubmissionId: { basePrice, markup, finalPrice } }

export function setTeamKitPricing(teamSubmissionId, basePrice, markup) {
  teamKitPricing[teamSubmissionId] = {
    basePrice: parseFloat(basePrice) || 150,
    markup: parseFloat(markup) || 0,
    finalPrice: (parseFloat(basePrice) || 150) + (parseFloat(markup) || 0)
  };
}

export function getTeamKitPricing(teamSubmissionId) {
  return teamKitPricing[teamSubmissionId] || { basePrice: 150, markup: 0, finalPrice: 150 };
}

export function getAllTeamPricing() {
  return teamKitPricing;
}
