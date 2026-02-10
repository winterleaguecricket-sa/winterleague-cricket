// File-based submissions storage for persistence without a database
// This saves submissions to a JSON file so they persist across server restarts

import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const SUBMISSIONS_FILE = path.join(DATA_DIR, 'submissions.json');

// Ensure data directory exists
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Load submissions from file
export function loadSubmissions() {
  try {
    ensureDataDir();
    if (fs.existsSync(SUBMISSIONS_FILE)) {
      const data = fs.readFileSync(SUBMISSIONS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading submissions:', error.message);
  }
  return [];
}

// Save submissions to file
export function saveSubmissions(submissions) {
  try {
    ensureDataDir();
    fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(submissions, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving submissions:', error.message);
    return false;
  }
}

// Add a new submission
export function addSubmission(submission) {
  const submissions = loadSubmissions();
  submissions.push(submission);
  saveSubmissions(submissions);
  return submission;
}

// Get all submissions or filter by formId
export function getSubmissions(formId = null) {
  const submissions = loadSubmissions();
  if (formId) {
    return submissions.filter(sub => sub.formId === formId);
  }
  return submissions;
}

// Update submission by id
export function updateSubmission(submissionId, updates) {
  const submissions = loadSubmissions();
  const index = submissions.findIndex(sub => sub.id === submissionId);
  if (index !== -1) {
    submissions[index] = { ...submissions[index], ...updates };
    saveSubmissions(submissions);
    return submissions[index];
  }
  return null;
}

// Get next submission ID
export function getNextSubmissionId() {
  const submissions = loadSubmissions();
  if (submissions.length === 0) return 1;
  const maxId = Math.max(...submissions.map(s => s.id || 0));
  return maxId + 1;
}
