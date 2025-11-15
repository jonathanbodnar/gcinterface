#!/usr/bin/env node

/**
 * Analyze reference files to understand bid proposal structure
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const referenceDir = path.join(__dirname, 'reference');

console.log('📁 Analyzing reference files...\n');

// Read and analyze each Excel file
const excelFiles = [
  'Starbucks 6212- Material Breakdown.xlsx',
  'Starbucks University Park Village_Plumbing Bid Proposal.xlsx',
  'Starbucks University Park Village_Mechanical Bid Proposal.xlsx',
  'Starbucks University Park Village_Electrical Bid Proposal.xlsx',
  'Blank - Bid Template.xlsx'
];

for (const filename of excelFiles) {
  const filePath = path.join(referenceDir, filename);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filename}`);
    continue;
  }

  console.log(`\n📊 Analyzing: ${filename}`);
  console.log('='.repeat(80));

  try {
    const workbook = XLSX.readFile(filePath);
    
    console.log(`\n📑 Sheets in workbook: ${workbook.SheetNames.length}`);
    
    for (const sheetName of workbook.SheetNames) {
      console.log(`\n  📄 Sheet: "${sheetName}"`);
      
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      
      // Show first 10 rows to understand structure
      console.log(`  Rows: ${jsonData.length}`);
      console.log(`\n  First 10 rows:`);
      
      for (let i = 0; i < Math.min(10, jsonData.length); i++) {
        const row = jsonData[i];
        if (row && row.length > 0) {
          console.log(`  ${i + 1}: ${JSON.stringify(row.slice(0, 10))}`); // First 10 columns
        }
      }
      
      // Try to identify column headers
      if (jsonData.length > 0) {
        const headers = jsonData[0];
        console.log(`\n  Detected Headers: ${JSON.stringify(headers.filter(h => h))}`);
      }
    }
    
  } catch (error) {
    console.error(`❌ Error analyzing ${filename}:`, error.message);
  }
}

console.log('\n\n✅ Analysis complete!\n');
