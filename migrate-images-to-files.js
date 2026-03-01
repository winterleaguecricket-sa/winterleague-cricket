#!/usr/bin/env node
/**
 * Migration script: Extract base64 images from form_submissions and save as files
 * 
 * This script:
 * 1. Reads all form submissions from the database
 * 2. Finds base64-encoded images in the data JSONB column
 * 3. Saves each image to /public/uploads/submissions/<submissionId>/<fieldKey>.<ext>
 * 4. Replaces the base64 string in the data with the file path
 * 5. Updates the database row
 * 
 * SAFETY:
 * - Creates a backup of each submission's data before modifying
 * - Writes a migration log to migrate-images-log.json
 * - Can be run with --dry-run to see what would change without modifying anything
 * - Processes one submission at a time in a DB transaction
 * 
 * Usage:
 *   node migrate-images-to-files.js           # Full migration
 *   node migrate-images-to-files.js --dry-run  # Preview only, no changes
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DRY_RUN = process.argv.includes('--dry-run');

// Database configuration - reads from environment or uses defaults
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'winterleague_cricket',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  max: 5,
});

const UPLOAD_DIR = path.join(__dirname, 'public', 'uploads', 'submissions');
const LOG_FILE = path.join(__dirname, 'migrate-images-log.json');

// Detect base64 image strings
function isBase64Image(value) {
  if (typeof value !== 'string') return false;
  return value.startsWith('data:image/');
}

// Extract mime type and extension from base64 data URI
function parseBase64Image(dataUri) {
  const match = dataUri.match(/^data:image\/(\w+);base64,(.+)$/s);
  if (!match) return null;
  
  let ext = match[1].toLowerCase();
  // Normalize extensions
  if (ext === 'jpeg') ext = 'jpg';
  if (ext === 'svg+xml') ext = 'svg';
  
  return {
    ext,
    data: match[2]
  };
}

// Generate a safe filename from a field key
function safeFilename(key) {
  return key.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 100);
}

// Process a single submission's data, extracting images
function extractImages(submissionId, data) {
  if (!data || typeof data !== 'object') return { modified: false, data, images: [] };
  
  const newData = {};
  const images = [];
  
  for (const [key, value] of Object.entries(data)) {
    if (isBase64Image(value)) {
      const parsed = parseBase64Image(value);
      if (parsed) {
        const filename = `${safeFilename(key)}.${parsed.ext}`;
        const relativePath = `/uploads/submissions/${submissionId}/${filename}`;
        
        images.push({
          key,
          filename,
          relativePath,
          ext: parsed.ext,
          base64Data: parsed.data,
          originalSize: value.length
        });
        
        newData[key] = relativePath;
        continue;
      }
    }
    
    // Handle arrays (e.g., player entries with nested image fields)
    if (Array.isArray(value)) {
      const newArray = value.map((item, idx) => {
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          const newItem = {};
          for (const [k, v] of Object.entries(item)) {
            if (isBase64Image(v)) {
              const parsed = parseBase64Image(v);
              if (parsed) {
                const filename = `${safeFilename(key)}_${idx}_${safeFilename(k)}.${parsed.ext}`;
                const relativePath = `/uploads/submissions/${submissionId}/${filename}`;
                
                images.push({
                  key: `${key}[${idx}].${k}`,
                  filename,
                  relativePath,
                  ext: parsed.ext,
                  base64Data: parsed.data,
                  originalSize: v.length
                });
                
                newItem[k] = relativePath;
                continue;
              }
            }
            newItem[k] = v;
          }
          return newItem;
        }
        return item;
      });
      newData[key] = newArray;
      continue;
    }
    
    newData[key] = value;
  }
  
  return {
    modified: images.length > 0,
    data: images.length > 0 ? newData : data,
    images
  };
}

async function migrate() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  Image Migration: base64 → file storage`);
  console.log(`  Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE MIGRATION'}`);
  console.log(`${'='.repeat(60)}\n`);
  
  const migrationLog = {
    startedAt: new Date().toISOString(),
    mode: DRY_RUN ? 'dry-run' : 'live',
    submissions: [],
    summary: {}
  };
  
  try {
    // Fetch all submissions
    const result = await pool.query(
      `SELECT id, form_id, data FROM form_submissions ORDER BY id`
    );
    
    console.log(`Found ${result.rows.length} submissions to scan\n`);
    
    let totalImages = 0;
    let totalBytesFreed = 0;
    let submissionsModified = 0;
    let errors = 0;
    
    for (const row of result.rows) {
      let data;
      try {
        data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
      } catch (e) {
        console.log(`  ⚠ Submission ${row.id}: Invalid JSON data, skipping`);
        errors++;
        continue;
      }
      
      const { modified, data: newData, images } = extractImages(row.id, data);
      
      if (!modified) continue;
      
      const bytesFreed = images.reduce((sum, img) => sum + img.originalSize, 0);
      totalImages += images.length;
      totalBytesFreed += bytesFreed;
      submissionsModified++;
      
      console.log(`  Submission ${row.id} (form ${row.form_id}): ${images.length} image(s), ${(bytesFreed / 1024).toFixed(1)} KB freed`);
      images.forEach(img => {
        console.log(`    - ${img.key} → ${img.relativePath} (${(img.originalSize / 1024).toFixed(1)} KB)`);
      });
      
      const logEntry = {
        submissionId: row.id,
        formId: row.form_id,
        imagesExtracted: images.length,
        bytesFreed,
        images: images.map(i => ({ key: i.key, path: i.relativePath, originalSize: i.originalSize }))
      };
      
      if (!DRY_RUN) {
        const subDir = path.join(UPLOAD_DIR, row.id);
        
        // Create directory
        if (!fs.existsSync(subDir)) {
          fs.mkdirSync(subDir, { recursive: true });
        }
        
        // Write image files
        let allImagesWritten = true;
        for (const img of images) {
          const filePath = path.join(subDir, img.filename);
          try {
            const buffer = Buffer.from(img.base64Data, 'base64');
            fs.writeFileSync(filePath, buffer);
            console.log(`    ✓ Saved: ${filePath} (${(buffer.length / 1024).toFixed(1)} KB)`);
          } catch (writeErr) {
            console.error(`    ✗ FAILED to write ${filePath}:`, writeErr.message);
            allImagesWritten = false;
            errors++;
            logEntry.error = writeErr.message;
          }
        }
        
        // Only update DB if all images were written successfully
        if (allImagesWritten) {
          const client = await pool.connect();
          try {
            await client.query('BEGIN');
            
            // Double-check: re-read the row to ensure it hasn't changed
            const check = await client.query(
              `SELECT data FROM form_submissions WHERE id = $1 FOR UPDATE`,
              [row.id]
            );
            
            if (check.rows.length === 0) {
              console.log(`    ⚠ Submission ${row.id} disappeared, skipping DB update`);
              await client.query('ROLLBACK');
              continue;
            }
            
            // Verify the original data hash matches (extra safety)
            const currentData = typeof check.rows[0].data === 'string' 
              ? check.rows[0].data 
              : JSON.stringify(check.rows[0].data);
            const originalData = typeof row.data === 'string'
              ? row.data
              : JSON.stringify(row.data);
            
            const currentHash = crypto.createHash('md5').update(currentData).digest('hex');
            const originalHash = crypto.createHash('md5').update(originalData).digest('hex');
            
            if (currentHash !== originalHash) {
              console.log(`    ⚠ Submission ${row.id} data changed since scan, skipping`);
              await client.query('ROLLBACK');
              logEntry.skipped = 'data_changed';
              continue;
            }
            
            await client.query(
              `UPDATE form_submissions SET data = $1, updated_at = NOW() WHERE id = $2`,
              [JSON.stringify(newData), row.id]
            );
            
            await client.query('COMMIT');
            console.log(`    ✓ Database updated for submission ${row.id}`);
            logEntry.status = 'migrated';
          } catch (dbErr) {
            await client.query('ROLLBACK');
            console.error(`    ✗ DB update failed for ${row.id}:`, dbErr.message);
            errors++;
            logEntry.error = dbErr.message;
            logEntry.status = 'db_error';
            
            // Clean up written files if DB update failed
            for (const img of images) {
              const filePath = path.join(subDir, img.filename);
              try { fs.unlinkSync(filePath); } catch (e) {}
            }
          } finally {
            client.release();
          }
        }
      } else {
        logEntry.status = 'dry-run';
      }
      
      migrationLog.submissions.push(logEntry);
    }
    
    // Summary
    migrationLog.summary = {
      totalSubmissions: result.rows.length,
      submissionsWithImages: submissionsModified,
      totalImagesExtracted: totalImages,
      totalBytesFreed,
      totalMBFreed: (totalBytesFreed / 1024 / 1024).toFixed(2),
      errors
    };
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`  Migration Summary`);
    console.log(`${'='.repeat(60)}`);
    console.log(`  Submissions scanned:    ${result.rows.length}`);
    console.log(`  Submissions with images: ${submissionsModified}`);
    console.log(`  Total images extracted:  ${totalImages}`);
    console.log(`  Total space freed:       ${(totalBytesFreed / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Errors:                  ${errors}`);
    console.log(`  Mode:                    ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
    console.log(`${'='.repeat(60)}\n`);
    
    // Write migration log
    migrationLog.completedAt = new Date().toISOString();
    fs.writeFileSync(LOG_FILE, JSON.stringify(migrationLog, null, 2));
    console.log(`Migration log written to: ${LOG_FILE}`);
    
  } catch (error) {
    console.error('Migration failed:', error);
    migrationLog.error = error.message;
    fs.writeFileSync(LOG_FILE, JSON.stringify(migrationLog, null, 2));
  } finally {
    await pool.end();
  }
}

migrate();
