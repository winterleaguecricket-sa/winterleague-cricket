# Sales Funnels Guide

## Overview
Sales funnels allow you to create guided, multi-step experiences for your customers. Instead of navigating freely through the site, customers follow a predefined path that leads them through specific pages, forms, and ultimately to checkout.

## How to Create a Funnel

1. Go to **Admin Panel** → **Sales Funnels**
2. Click **Create New Funnel**
3. Enter a name and description
4. Click **Save Funnel**

## Adding Steps to a Funnel

After creating a funnel, you can add steps:

### Step Types

1. **Category** - Show products from a specific category
   - Select which category to display
   - Customers can browse products

2. **Form** - Display a form for data collection
   - Select which form to show
   - Form submission advances to next step

3. **Page** - Show a custom content page
   - Select which page to display
   - Good for information, terms, etc.

4. **Checkout** - Final step for purchase completion
   - No configuration needed
   - Should be the last step

### Managing Steps

- **Add Step**: Fill out the form and click "Add Step"
- **Reorder Steps**: Use the ↑ and ↓ arrows on each step
- **Delete Step**: Click the "Delete" button on any step
- **Edit Step**: Currently requires deleting and recreating

## Attaching Funnels to Buttons

Go to **Admin Panel** → **Site Settings** → **Button Funnels** section

You can attach funnels to these buttons:
- Hero Primary Button (main CTA)
- Hero Secondary Button (secondary CTA)
- Premium Equipment Channel Button
- Training Gear Channel Button

**To attach a funnel:**
1. Select a funnel from the dropdown for each button
2. Click "Save Changes"
3. When customers click that button, they'll enter the funnel flow instead of navigating to the regular page

**To remove a funnel:**
1. Select "No Funnel (Regular Link)" from the dropdown
2. Click "Save Changes"
3. Button will return to normal navigation

## Funnel User Experience

When a customer clicks a button with an attached funnel:

1. They're taken to `/funnel/[funnelId]?step=1`
2. A progress bar shows their position in the funnel
3. Step information is displayed at the top
4. Content loads based on step type
5. "Previous" and "Next" buttons allow navigation
6. Forms auto-advance on successful submission
7. "Exit Funnel" link in header returns to homepage

## Best Practices

- **Keep funnels focused**: 3-5 steps is ideal
- **Always end with checkout**: If the goal is purchase
- **Use forms strategically**: Collect info before showing products
- **Test the flow**: Click through as a customer would
- **Active funnels only**: Only active funnels appear in settings

## Example Funnel Flow

**Premium Equipment Purchase Flow:**
1. Form (Equipment Registration) - Learn customer needs
2. Category (Premium Equipment) - Show relevant products
3. Checkout - Complete purchase

This guides customers through qualification before showing products, increasing conversion rates.

## Technical Notes

- Funnel URLs: `/funnel/[funnelId]?step=[stepNumber]`
- Step navigation uses order numbers (1, 2, 3, etc.)
- Form submissions trigger auto-advance after 2 seconds
- Inactive funnels won't appear in button settings
- Funnel state is URL-based (no session storage yet)

## Troubleshooting

**Button still goes to regular page:**
- Check if funnel is set to Active
- Verify you saved settings
- Refresh the homepage

**Form doesn't advance:**
- Check if there's a next step in the funnel
- Verify form submission was successful
- Wait 2 seconds after form submit

**Steps display in wrong order:**
- Use the ↑↓ buttons to reorder
- Steps are sorted by order number

**Can't find my funnel:**
- Only Active funnels appear in dropdowns
- Check Sales Funnels page to activate
